const { UniqueConstraintError } = require('sequelize');
const {
  EdomJawaban,
  AngketDosenPertanyaan,
  AngketDosenJawaban,
  KuesionerDosenKelas,
  Krs,
  KrsDetail,
  JadwalKuliah,
  Dosen,
  TahunAjaran,
  KehadiranDosen,
  KehadiranMahasiswa,
  Mahasiswa,
  Jurusan,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { formatTahunAjaran } = require('../utils/tahunAjaran');

/**
 * Angket dosen / EDOM (Evaluasi Dosen Oleh Mahasiswa) di portal mahasiswa. Mahasiswa menilai setiap
 * dosen pengajar (kordinator + pengampu yang dicentang "Isi Kuesioner" oleh prodi) pada kelas di KRS
 * yang sudah DISETUJUI tahun akademik aktif. Pertanyaan dari master Prodi → Pertanyaan Angket Dosen
 * sesuai tahun akademik aktif & tk. pendidikan prodi mahasiswa, pilihan jawaban satu untuk semua; jawaban disimpan sebagai snapshot (master boleh berubah kemudian).
 * Satu isian per (mahasiswa, kelas, dosen) dan tidak bisa diubah setelah dikirim.
 */

const namaDosen = (d) => [d.namaLengkap, d.gelar].filter(Boolean).join(', ');

/** Pertanyaan periode & tk. pendidikan tsb (tanpa periode/jenjang = kosong) + pilihan jawaban. */
const getMaster = async (tahunAjaranId = null, jenjangPendidikan = null) => {
  const [pertanyaan, jawaban] = await Promise.all([
    tahunAjaranId && jenjangPendidikan
      ? AngketDosenPertanyaan.findAll({ where: { tahunAjaranId, jenjangPendidikan }, order: [['urutan', 'ASC'], ['id', 'ASC']] })
      : [],
    AngketDosenJawaban.findAll({ order: [['nilai', 'DESC'], ['id', 'ASC']] }),
  ]);
  return {
    pertanyaan: pertanyaan.map((p) => ({ id: p.id, kategori: p.kategori, pertanyaan: p.pertanyaan, openQuestion: p.openQuestion })),
    pilihanJawaban: jawaban.map((j) => ({ id: j.id, jawaban: j.jawaban, nilai: j.nilai })),
  };
};

/** Kelas di KRS disetujui tahun akademik aktif + dosen yang dinilai di tiap kelas. */
/** Jenjang (tk. pendidikan) prodi mahasiswa, penentu daftar pertanyaan. */
const jenjangMahasiswa = async (mahasiswaId) => {
  const m = await Mahasiswa.findByPk(mahasiswaId, { attributes: ['id', 'jurusanId'], include: [{ model: Jurusan, as: 'jurusan', attributes: ['jenjangPendidikan'] }] });
  return m?.jurusan?.jenjangPendidikan ?? null;
};

const tahunAjaranAktif = () => TahunAjaran.findOne({ where: { isActive: true }, order: [['id', 'DESC']] });

const kelasDinilai = async (mahasiswaId) => {
  const tahunAjaran = await tahunAjaranAktif();
  if (!tahunAjaran) return { tahunAjaran: null, kelas: [] };
  const krs = await Krs.findOne({
    where: { mahasiswaId, tahunAjaranId: tahunAjaran.id, status: 'DISETUJUI' },
    include: [{ model: KrsDetail, as: 'detailList', attributes: ['jadwalKuliahId'] }],
  });
  const jadwalIds = (krs?.detailList ?? []).map((d) => d.jadwalKuliahId);
  if (!jadwalIds.length) return { tahunAjaran, kelas: [], semester: krs?.semester ?? null };

  const [jadwalList, nonaktif] = await Promise.all([
    JadwalKuliah.findAll({
      where: { id: jadwalIds },
      include: [
        { model: Dosen.unscoped(), as: 'dosenKordinator', attributes: ['id', 'nidn', 'namaLengkap', 'gelar'], required: false },
        { model: Dosen.unscoped(), as: 'dosenPengampu', attributes: ['id', 'nidn', 'namaLengkap', 'gelar'], through: { attributes: [] }, required: false },
      ],
      order: [['namaMataKuliah', 'ASC']],
    }),
    KuesionerDosenKelas.findAll({ where: { jadwalKuliahId: jadwalIds, isiKuesioner: false }, attributes: ['jadwalKuliahId', 'dosenId'], raw: true }),
  ]);
  const tidakDinilai = new Set(nonaktif.map((k) => `${k.jadwalKuliahId}-${k.dosenId}`));
  const kelas = jadwalList.map((j) => {
    const tim = [
      ...(j.dosenKordinator ? [{ dosen: j.dosenKordinator, penanggungJawab: true }] : []),
      ...(j.dosenPengampu ?? []).filter((d) => d.id !== j.dosenKordinatorId).map((d) => ({ dosen: d, penanggungJawab: false })),
    ].filter((t) => !tidakDinilai.has(`${j.id}-${t.dosen.id}`));
    return { jadwal: j, tim };
  });
  return { tahunAjaran, kelas, semester: krs.semester };
};

/** Rekap kehadiran mahasiswa per kelas: hadir / jumlah pertemuan yang sudah berjalan. */
const kehadiranPerKelas = async (mahasiswaId, jadwalIds) => {
  if (!jadwalIds.length) return new Map();
  const pertemuan = await KehadiranDosen.findAll({ where: { jadwalKuliahId: jadwalIds }, attributes: ['id', 'jadwalKuliahId'], raw: true });
  const hadir = pertemuan.length
    ? await KehadiranMahasiswa.findAll({
        where: { mahasiswaId, kehadiranDosenId: pertemuan.map((p) => p.id), status: 'HADIR' },
        attributes: ['kehadiranDosenId'],
        raw: true,
      })
    : [];
  const jadwalOf = new Map(pertemuan.map((p) => [p.id, p.jadwalKuliahId]));
  const map = new Map(jadwalIds.map((id) => [id, { hadir: 0, pertemuan: 0 }]));
  pertemuan.forEach((p) => (map.get(p.jadwalKuliahId).pertemuan += 1));
  hadir.forEach((h) => (map.get(jadwalOf.get(h.kehadiranDosenId)).hadir += 1));
  return map;
};

const getAngketMahasiswa = async (mahasiswaId) => {
  const [{ tahunAjaran, kelas }, jenjang] = await Promise.all([kelasDinilai(mahasiswaId), jenjangMahasiswa(mahasiswaId)]);
  const master = await getMaster(tahunAjaran?.id, jenjang);
  const jadwalIds = kelas.map((k) => k.jadwal.id);
  const [isian, kehadiran] = await Promise.all([
    jadwalIds.length ? EdomJawaban.findAll({ where: { mahasiswaId, jadwalKuliahId: jadwalIds }, attributes: ['jadwalKuliahId', 'dosenId', 'createdAt'] }) : [],
    kehadiranPerKelas(mahasiswaId, jadwalIds),
  ]);
  const diisi = new Map(isian.map((i) => [`${i.jadwalKuliahId}-${i.dosenId}`, i.createdAt]));
  const rows = kelas.map(({ jadwal, tim }) => ({
    jadwalKuliahId: jadwal.id,
    kodeMataKuliah: jadwal.kodeMataKuliah,
    namaMataKuliah: jadwal.namaMataKuliah,
    kelas: jadwal.kelas,
    sks: jadwal.sks,
    kehadiran: kehadiran.get(jadwal.id) ?? { hadir: 0, pertemuan: 0 },
    dosen: tim.map((t) => ({
      dosenId: t.dosen.id,
      nidn: t.dosen.nidn,
      nama: namaDosen(t.dosen),
      penanggungJawab: t.penanggungJawab,
      sudahDiisi: diisi.has(`${jadwal.id}-${t.dosen.id}`),
      diisiPada: diisi.get(`${jadwal.id}-${t.dosen.id}`) ?? null,
    })),
  }));
  const semua = rows.flatMap((r) => r.dosen);
  return {
    tahunAjaran: formatTahunAjaran(tahunAjaran),
    jenjangPendidikan: jenjang,
    ...master,
    kelas: rows,
    ringkasan: { total: semua.length, sudah: semua.filter((d) => d.sudahDiisi).length },
  };
};

/** payload: { jadwalKuliahId, dosenId, jawaban: [{ pertanyaanId, nilai?, teks? }], saran? } */
const submit = async (mahasiswaId, payload) => {
  const [{ tahunAjaran, kelas }, jenjang] = await Promise.all([kelasDinilai(mahasiswaId), jenjangMahasiswa(mahasiswaId)]);
  const k = kelas.find((x) => x.jadwal.id === Number(payload.jadwalKuliahId));
  if (!k) throw new ApiError(403, 'Kelas ini tidak ada di KRS disetujui Anda pada tahun akademik aktif');
  if (!k.tim.some((t) => t.dosen.id === Number(payload.dosenId))) throw new ApiError(400, 'Dosen ini tidak dinilai pada kelas tersebut');

  const { pertanyaan, pilihanJawaban } = await getMaster(tahunAjaran?.id, jenjang);
  if (!pertanyaan.length) throw new ApiError(400, 'Pertanyaan angket dosen periode ini belum diatur prodi');
  const jawabanBy = new Map(payload.jawaban.map((j) => [Number(j.pertanyaanId), j]));
  const pilihanBy = new Map(pilihanJawaban.map((p) => [p.nilai, p]));
  const snapshot = pertanyaan.map((p, i) => {
    const j = jawabanBy.get(p.id);
    if (p.openQuestion) {
      return { pertanyaanId: p.id, pertanyaan: p.pertanyaan, openQuestion: true, nilai: null, jawaban: null, teks: (j?.teks ?? '').trim() || null };
    }
    const pilihan = j && j.nilai !== undefined && j.nilai !== null ? pilihanBy.get(Number(j.nilai)) : null;
    if (!pilihan) throw new ApiError(400, `Pertanyaan nomor ${i + 1} belum dijawab`);
    return { pertanyaanId: p.id, pertanyaan: p.pertanyaan, openQuestion: false, nilai: pilihan.nilai, jawaban: pilihan.jawaban, teks: null };
  });

  try {
    await EdomJawaban.create({
      mahasiswaId,
      jadwalKuliahId: k.jadwal.id,
      dosenId: Number(payload.dosenId),
      jawaban: snapshot,
      saran: payload.saran?.trim() || null,
    });
  } catch (err) {
    if (err instanceof UniqueConstraintError) throw new ApiError(409, 'Angket untuk dosen ini sudah pernah diisi');
    throw err;
  }
};

/**
 * Status angket per mata kuliah semester berjalan, untuk mengunci nilai KHS: Map kodeMataKuliah →
 * { semester, jadwalKuliahId, belum }. Kosong bila prodi belum mengatur pertanyaan periode ini
 * (mahasiswa tidak bisa mengisi, jadi nilai tidak dikunci).
 */
const statusAngketNilai = async (mahasiswaId) => {
  const [{ tahunAjaran, kelas, semester }, jenjang] = await Promise.all([kelasDinilai(mahasiswaId), jenjangMahasiswa(mahasiswaId)]);
  if (!kelas.length || !tahunAjaran || !jenjang) return new Map();
  const adaPertanyaan = await AngketDosenPertanyaan.count({ where: { tahunAjaranId: tahunAjaran.id, jenjangPendidikan: jenjang } });
  if (!adaPertanyaan) return new Map();
  const isian = await EdomJawaban.findAll({
    where: { mahasiswaId, jadwalKuliahId: kelas.map((k) => k.jadwal.id) },
    attributes: ['jadwalKuliahId', 'dosenId'],
    raw: true,
  });
  const sudah = new Set(isian.map((i) => `${i.jadwalKuliahId}-${i.dosenId}`));
  return new Map(
    kelas.map(({ jadwal, tim }) => [
      jadwal.kodeMataKuliah,
      { semester, jadwalKuliahId: jadwal.id, belum: tim.filter((t) => !sudah.has(`${jadwal.id}-${t.dosen.id}`)).length },
    ])
  );
};

module.exports = { getMaster, getAngketMahasiswa, submit, statusAngketNilai };
