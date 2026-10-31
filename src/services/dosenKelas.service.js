const { Op } = require('sequelize');
const {
  sequelize,
  JadwalKuliah,
  KehadiranDosen,
  KehadiranMahasiswa,
  KrsDetail,
  Krs,
  Mahasiswa,
  MahasiswaBiodata,
  GolonganKelas,
  Dosen,
  NilaiMahasiswa,
  TahunAjaran,
  JadwalKuliahDosenPengampu,
  KuesionerDosenKelas,
  Kurikulum,
  MataKuliah,
  Jurusan,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { gradeFor } = require('../utils/gradeScale');
const { formatTahunAjaran } = require('../utils/tahunAjaran');
const { kodeProdiJadwal } = require('../utils/prodiJadwal');
const bobotObeService = require('./bobotObe.service');

/**
 * Fitur per kelas untuk portal dosen: cetak realisasi mengajar, rekap kehadiran mahasiswa per
 * pertemuan, dan input nilai kelas. Semua fungsi menerima dosenId dari sesi login dan menolak
 * kelas yang tidak diampu dosen tsb (kordinator maupun pengampu).
 */

const ensureKelasDosen = async (jadwalKuliahId, dosenId) => {
  const jadwal = await JadwalKuliah.findByPk(jadwalKuliahId, {
    include: [
      { model: Dosen.unscoped(), as: 'dosenKordinator', required: false },
      { model: Dosen.unscoped(), as: 'dosenPengampu', through: { attributes: [] }, required: false },
      { model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'nama', 'jenisSemester'], required: false },
    ],
  });
  if (!jadwal) throw new ApiError(404, 'Kelas tidak ditemukan');
  const pengajar = [jadwal.dosenKordinatorId, ...(jadwal.dosenPengampu ?? []).map((d) => d.id)];
  if (!pengajar.includes(Number(dosenId))) throw new ApiError(403, 'Anda tidak mengampu kelas ini');
  return jadwal;
};

const namaDosen = (d) => (d ? [d.namaLengkap, d.gelar].filter(Boolean).join(', ') : '-');

const infoKelas = (jadwal) => ({
  id: jadwal.id,
  kelas: jadwal.kelas,
  kodeMataKuliah: jadwal.kodeMataKuliah,
  namaMataKuliah: jadwal.namaMataKuliah,
  sks: jadwal.sks,
  semester: jadwal.semester,
  tahunAjaran: formatTahunAjaran(jadwal.tahunAjaran),
  ruangan: jadwal.ruangan,
  dosenKordinator: namaDosen(jadwal.dosenKordinator),
  dosenPengampu: (jadwal.dosenPengampu ?? []).map(namaDosen),
});

/** Mahasiswa peserta kelas: KRS yang sudah DISETUJUI, urut nama. */
const rosterKelas = async (jadwalKuliahId) => {
  const rows = await KrsDetail.findAll({
    where: { jadwalKuliahId },
    include: [
      {
        model: Krs,
        as: 'krs',
        required: true,
        where: { status: 'DISETUJUI' },
        include: [{ model: Mahasiswa, as: 'mahasiswa', required: true, attributes: ['id', 'nim', 'namaLengkap'] }],
      },
    ],
  });
  return rows
    .map((r) => ({ mahasiswaId: r.krs.mahasiswa.id, nim: r.krs.mahasiswa.nim, namaLengkap: r.krs.mahasiswa.namaLengkap, semester: r.krs.semester }))
    .sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap));
};

const pertemuanKelas = (jadwalKuliahId) =>
  KehadiranDosen.findAll({
    where: { jadwalKuliahId },
    include: [{ model: Dosen.unscoped(), as: 'dosen', attributes: ['id', 'namaLengkap', 'gelar'], required: false }],
    order: [
      ['tanggalRealisasi', 'ASC'],
      ['id', 'ASC'],
    ],
  });

// ---------- Realisasi mengajar ----------
const getRealisasiKelas = async (dosenId, jadwalKuliahId) => {
  const jadwal = await ensureKelasDosen(jadwalKuliahId, dosenId);
  const pertemuan = await pertemuanKelas(jadwal.id);
  const hadirRows = pertemuan.length
    ? await KehadiranMahasiswa.findAll({
        attributes: ['kehadiranDosenId', 'mahasiswaId'],
        where: { kehadiranDosenId: pertemuan.map((p) => p.id), status: 'HADIR' },
        raw: true,
      })
    : [];
  // Hanya peserta resmi kelas (KRS disetujui) yang dihitung, konsisten dengan rekap kehadiran.
  const roster = await rosterKelas(jadwal.id);
  const peserta = new Set(roster.map((m) => m.mahasiswaId));
  const hadirBy = new Map();
  hadirRows.filter((r) => peserta.has(r.mahasiswaId)).forEach((r) => hadirBy.set(r.kehadiranDosenId, (hadirBy.get(r.kehadiranDosenId) ?? 0) + 1));
  return {
    kelas: infoKelas(jadwal),
    jumlahMahasiswa: roster.length,
    pertemuan: pertemuan.map((p, i) => ({
      no: i + 1,
      pertemuanKe: p.pertemuanKe ?? i + 1,
      tanggal: p.tanggalRealisasi,
      jamMasuk: p.jamMasuk,
      jamKeluar: p.jamKeluar,
      dosen: namaDosen(p.dosen),
      status: p.status,
      uraian: p.uraian,
      keterangan: p.keterangan,
      jumlahHadir: hadirBy.get(p.id) ?? 0,
    })),
  };
};

// ---------- Rekap kehadiran mahasiswa ----------
const getRekapKehadiranKelas = async (dosenId, jadwalKuliahId) => rekapKehadiranJadwal(await ensureKelasDosen(jadwalKuliahId, dosenId));

/** Matriks presensi peserta (KRS disetujui) × pertemuan satu kelas; `jadwal` sudah dicek aksesnya oleh pemanggil. */
const rekapKehadiranJadwal = async (jadwal) => {
  const [roster, pertemuan] = await Promise.all([rosterKelas(jadwal.id), pertemuanKelas(jadwal.id)]);
  const presensi = pertemuan.length
    ? await KehadiranMahasiswa.findAll({ where: { kehadiranDosenId: pertemuan.map((p) => p.id) }, raw: true })
    : [];
  const statusBy = new Map(presensi.map((p) => [`${p.mahasiswaId}|${p.kehadiranDosenId}`, p.status]));

  const kolom = pertemuan.map((p, i) => ({ id: p.id, pertemuanKe: p.pertemuanKe ?? i + 1, tanggal: p.tanggalRealisasi }));
  const mahasiswa = roster.map((m, i) => {
    const status = kolom.map((k) => statusBy.get(`${m.mahasiswaId}|${k.id}`) ?? null);
    const hitung = (s) => status.filter((x) => x === s).length;
    const hadir = hitung('HADIR');
    return {
      no: i + 1,
      mahasiswaId: m.mahasiswaId,
      nim: m.nim,
      namaLengkap: m.namaLengkap,
      status,
      hadir,
      izin: hitung('IZIN'),
      sakit: hitung('SAKIT'),
      alpa: hitung('ALPA'),
      persen: kolom.length ? Math.round((hadir / kolom.length) * 1000) / 10 : 0,
    };
  });
  return { kelas: infoKelas(jadwal), pertemuan: kolom, mahasiswa };
};

// ---------- Peserta kelas (Master Monitoring BAAK) ----------
/**
 * Semua mahasiswa yang mengambil kelas ini di KRS-nya (status KRS apa pun, supaya BAAK juga melihat
 * yang belum disetujui), beserta rekap kehadiran: hadir / jumlah pertemuan yang sudah berjalan.
 */
const getPesertaKelas = async (jadwalKuliahId) => {
  const jadwal = await JadwalKuliah.findByPk(jadwalKuliahId, { attributes: ['id', 'kelas'] });
  if (!jadwal) throw new ApiError(404, 'Kelas tidak ditemukan');
  const [rows, pertemuan] = await Promise.all([
    KrsDetail.findAll({
      where: { jadwalKuliahId },
      include: [
        {
          model: Krs,
          as: 'krs',
          required: true,
          attributes: ['id', 'status', 'semester'],
          include: [
            {
              model: Mahasiswa,
              as: 'mahasiswa',
              required: true,
              attributes: ['id', 'nim', 'namaLengkap', 'isActive', 'statusKeluar'],
              include: [
                { model: GolonganKelas, as: 'golonganKelas', attributes: ['namaKelas'], required: false },
                { model: MahasiswaBiodata, as: 'biodata', attributes: ['waktuKuliah'], required: false },
              ],
            },
          ],
        },
      ],
    }),
    KehadiranDosen.findAll({ where: { jadwalKuliahId, isDelete: false }, attributes: ['id'], raw: true }),
  ]);
  const hadirRows = pertemuan.length
    ? await KehadiranMahasiswa.findAll({
        attributes: ['mahasiswaId'],
        where: { kehadiranDosenId: pertemuan.map((p) => p.id), status: 'HADIR' },
        raw: true,
      })
    : [];
  const hadirBy = new Map();
  hadirRows.forEach((r) => hadirBy.set(r.mahasiswaId, (hadirBy.get(r.mahasiswaId) ?? 0) + 1));

  return rows
    .map((r) => {
      const m = r.krs.mahasiswa;
      const hadir = hadirBy.get(m.id) ?? 0;
      return {
        id: r.id,
        mahasiswaId: m.id,
        nim: m.nim,
        namaLengkap: m.namaLengkap,
        sistemKuliah: m.golonganKelas?.namaKelas ?? null,
        statusKrs: r.krs.status,
        statusMahasiswa: !m.isActive ? 'TIDAK_AKTIF' : m.statusKeluar ?? 'AKTIF',
        waktuKuliah: m.biodata?.waktuKuliah ?? null,
        semester: r.krs.semester,
        kelas: jadwal.kelas,
        hadir,
        jumlahPertemuan: pertemuan.length,
        persen: pertemuan.length ? Math.round((hadir / pertemuan.length) * 1000) / 10 : null,
      };
    })
    .sort((a, b) => a.nim.localeCompare(b.nim));
};

// ---------- Input nilai kelas ----------
// Komponen nilai = komponen Bobot OBE (persentasenya ditetapkan per kelas).
const KOMPONEN = bobotObeService.KOMPONEN_OBE;

const getNilaiKelas = async (dosenId, jadwalKuliahId) => {
  const jadwal = await ensureKelasDosen(jadwalKuliahId, dosenId);
  const roster = await rosterKelas(jadwal.id);
  const nilaiList = roster.length
    ? await NilaiMahasiswa.findAll({
        where: { mahasiswaId: { [Op.in]: roster.map((m) => m.mahasiswaId) }, kodeMataKuliah: jadwal.kodeMataKuliah },
      })
    : [];
  const nilaiBy = new Map(nilaiList.map((n) => [`${n.mahasiswaId}|${n.semester}`, n]));
  return {
    kelas: infoKelas(jadwal),
    // null = Bobot OBE kelas belum diisi; dosen wajib mengisinya sebelum menyimpan nilai.
    bobotObe: await bobotObeService.getBobot(jadwal.id),
    mahasiswa: roster.map((m, i) => {
      const n = nilaiBy.get(`${m.mahasiswaId}|${m.semester}`);
      return {
        no: i + 1,
        mahasiswaId: m.mahasiswaId,
        nim: m.nim,
        namaLengkap: m.namaLengkap,
        semester: m.semester,
        ...Object.fromEntries(KOMPONEN.map((k) => [k, n ? Number(n[k]) : null])),
        nilai: n ? Number(n.nilai) : null,
        grade: n?.grade ?? null,
      };
    }),
  };
};

/** Simpan nilai komponen; nilai akhir & huruf dihitung dengan Bobot OBE kelas (wajib sudah diisi). */
const saveNilaiKelas = async (dosenId, jadwalKuliahId, items) => {
  const jadwal = await ensureKelasDosen(jadwalKuliahId, dosenId);
  const bobot = await bobotObeService.getBobot(jadwal.id);
  if (!bobot) throw new ApiError(400, 'Isi Bobot OBE kelas ini terlebih dahulu sebelum menyimpan nilai');
  const roster = new Map((await rosterKelas(jadwal.id)).map((m) => [m.mahasiswaId, m]));
  const asing = items.find((it) => !roster.has(Number(it.mahasiswaId)));
  if (asing) throw new ApiError(400, `Mahasiswa id ${asing.mahasiswaId} bukan peserta kelas ini`);

  await sequelize.transaction(async (transaction) => {
    for (const it of items) {
      const m = roster.get(Number(it.mahasiswaId));
      const komponen = Object.fromEntries(KOMPONEN.map((k) => [k, Math.min(Math.max(Number(it[k]) || 0, 0), 100)]));
      const nilai = bobotObeService.hitungNilaiObe(komponen, bobot);
      const data = {
        ...komponen,
        nilai,
        grade: gradeFor(nilai),
        namaMataKuliah: jadwal.namaMataKuliah,
        sks: jadwal.sks ?? 0,
      };
      const existing = await NilaiMahasiswa.findOne({
        where: { mahasiswaId: m.mahasiswaId, kodeMataKuliah: jadwal.kodeMataKuliah, semester: m.semester },
        transaction,
      });
      if (existing) await existing.update(data, { transaction });
      else await NilaiMahasiswa.create({ ...data, mahasiswaId: m.mahasiswaId, kodeMataKuliah: jadwal.kodeMataKuliah, semester: m.semester }, { transaction });
    }
  });
  return getNilaiKelas(dosenId, jadwalKuliahId);
};

/** Bobot OBE kelas dosen (null = belum diisi). */
const getBobotObeKelas = async (dosenId, jadwalKuliahId) => {
  const jadwal = await ensureKelasDosen(jadwalKuliahId, dosenId);
  return bobotObeService.getBobot(jadwal.id);
};

/** Dosen pengampu mengisi/mengubah Bobot OBE kelasnya (nilai yang sudah ada dihitung ulang). */
const saveBobotObeKelas = async (dosenId, jadwalKuliahId, payload) => {
  const jadwal = await ensureKelasDosen(jadwalKuliahId, dosenId);
  return bobotObeService.simpanBobot(jadwal.id, payload, { dosenId });
};

/**
 * Detail kelas + tim Dosen Pengajar (seperti menu Kelas Kuliah → Dosen Pengajar): dosen kordinator
 * sebagai Penanggung Jawab, lalu dosen pengampu. SKS per dosen dari pembagian SKS pengampu; bila
 * belum dibagi, seluruh SKS kelas dicatat pada penanggung jawab. isiKuesioner = dosen dinilai
 * mahasiswa lewat kuesioner kelas (default ya; diatur prodi di Prodi → Dosen → Detail). dosenId (portal dosen) menandai
 * baris dosen yang login; null untuk modul staf (Prodi).
 */
const detailDosenPengajar = async (jadwal, dosenId = null) => {
  const [pivot, kurikulum, roster, kuesioner] = await Promise.all([
    JadwalKuliahDosenPengampu.findAll({ where: { jadwalKuliahId: jadwal.id }, order: [['id', 'ASC']] }),
    jadwal.mataKuliahId
      ? MataKuliah.findByPk(jadwal.mataKuliahId, { attributes: ['id', 'kurikulumId'] }).then((mk) =>
          mk
            ? Kurikulum.findByPk(mk.kurikulumId, {
                attributes: ['id', 'tahunKurikulum'],
                include: [{ model: Jurusan, as: 'jurusan', attributes: ['namaJurusan', 'kodeProdi'], required: false }],
              })
            : null
        )
      : null,
    rosterKelas(jadwal.id),
    KuesionerDosenKelas.findAll({ where: { jadwalKuliahId: jadwal.id }, attributes: ['dosenId', 'isiKuesioner'], raw: true }),
  ]);
  const kuesionerBy = new Map(kuesioner.map((k) => [k.dosenId, !!k.isiKuesioner]));
  const kodeProdi = kodeProdiJadwal({ kelas: jadwal.kelas, mataKuliah: kurikulum ? { kurikulum } : null });
  const prodi = kurikulum?.jurusan ?? (kodeProdi ? await Jurusan.findOne({ where: { kodeProdi }, order: [['id', 'ASC']] }) : null);

  const sksBy = new Map(pivot.map((p) => [p.dosenId, p.sks]));
  const totalSksPengampu = pivot.reduce((s, p) => s + (Number(p.sks) || 0), 0);
  const jadwalDosen = { hari: jadwal.hari ?? [], jam: jadwal.jam, ruangan: jadwal.ruangan };
  const pengampu = (jadwal.dosenPengampu ?? []).filter((d) => d.id !== jadwal.dosenKordinatorId);
  const dosenPengajar = [
    ...(jadwal.dosenKordinator
      ? [{ dosen: jadwal.dosenKordinator, sks: sksBy.get(jadwal.dosenKordinatorId) ?? (totalSksPengampu ? null : jadwal.sks), penanggungJawab: true }]
      : []),
    ...pengampu.map((d) => ({ dosen: d, sks: sksBy.get(d.id) ?? null, penanggungJawab: false })),
  ].map((r, i) => ({
    urutan: i + 1,
    dosenId: r.dosen.id,
    nidn: r.dosen.nidn ?? null,
    nama: namaDosen(r.dosen),
    sks: r.sks === null || r.sks === undefined ? null : Number(r.sks),
    penanggungJawab: r.penanggungJawab,
    isiKuesioner: kuesionerBy.get(r.dosen.id) ?? true,
    saya: dosenId !== null && r.dosen.id === Number(dosenId),
    ...jadwalDosen,
  }));

  return {
    kelas: {
      ...infoKelas(jadwal),
      programStudi: prodi?.namaJurusan ?? null,
      kurikulum: kurikulum?.tahunKurikulum ?? null,
      peserta: roster.length,
      ...jadwalDosen,
    },
    dosenPengajar,
  };
};

/** Portal dosen: hanya kelas yang diampu dosen login. */
const getDosenPengajarKelas = async (dosenId, jadwalKuliahId) => detailDosenPengajar(await ensureKelasDosen(jadwalKuliahId, dosenId), dosenId);

/**
 * Modul staf (Prodi → Dosen → Detail): semua kelas yang diajar satu dosen (kordinator/pengampu)
 * pada tahun ajaran terpilih, beserta peran dosen tsb di tiap kelas (Penanggung Jawab, SKS, Isi
 * Kuesioner) dan tim dosen pengajarnya. `jadwalIds` (opsional) membatasi ke kelas prodi sesi.
 */
const listKelasDosen = async (dosenId, { tahunAjaranId = null, jadwalIds = null } = {}) => {
  const dosen = await Dosen.unscoped().findByPk(dosenId, { attributes: ['id', 'nidn', 'namaLengkap', 'gelar'] });
  if (!dosen) throw new ApiError(404, 'Dosen tidak ditemukan');
  const pivotIds = (await JadwalKuliahDosenPengampu.findAll({ where: { dosenId }, attributes: ['jadwalKuliahId'], raw: true })).map((p) => p.jadwalKuliahId);
  const where = { [Op.or]: [{ dosenKordinatorId: dosenId }, ...(pivotIds.length ? [{ id: pivotIds }] : [])] };
  if (tahunAjaranId) where.tahunAjaranId = Number(tahunAjaranId);
  if (jadwalIds) where[Op.and] = [{ id: jadwalIds.length ? jadwalIds : [0] }];
  const jadwalList = await JadwalKuliah.findAll({
    where,
    include: [
      { model: Dosen.unscoped(), as: 'dosenKordinator', required: false },
      { model: Dosen.unscoped(), as: 'dosenPengampu', through: { attributes: [] }, required: false },
      { model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'nama', 'jenisSemester'], required: false },
    ],
    order: [['namaMataKuliah', 'ASC'], ['kelas', 'ASC']],
  });
  const kelas = [];
  for (const jadwal of jadwalList) {
    const detail = await detailDosenPengajar(jadwal, dosenId);
    const saya = detail.dosenPengajar.find((d) => d.saya);
    kelas.push({
      ...detail.kelas,
      dosenKe: saya?.urutan ?? null,
      sksDosen: saya?.sks ?? null,
      penanggungJawab: !!saya?.penanggungJawab,
      isiKuesioner: !!saya?.isiKuesioner,
      dosenPengajar: detail.dosenPengajar,
    });
  }
  return {
    dosen: { id: dosen.id, nidn: dosen.nidn, nama: namaDosen(dosen) },
    kelas,
    ringkasan: {
      jumlahKelas: kelas.length,
      totalSks: kelas.reduce((s, k) => s + (k.sksDosen ?? 0), 0),
      penanggungJawab: kelas.filter((k) => k.penanggungJawab).length,
    },
  };
};

/** Ubah status "Isi Kuesioner" dosen di satu kelas (dosen harus pengajar kelas tsb). */
const setIsiKuesioner = async (dosenId, jadwalKuliahId, isiKuesioner, userId = null) => {
  const jadwal = await JadwalKuliah.findByPk(jadwalKuliahId, {
    attributes: ['id', 'dosenKordinatorId'],
    include: [{ model: Dosen.unscoped(), as: 'dosenPengampu', attributes: ['id'], through: { attributes: [] }, required: false }],
  });
  if (!jadwal) throw new ApiError(404, 'Kelas tidak ditemukan');
  const pengajar = [jadwal.dosenKordinatorId, ...(jadwal.dosenPengampu ?? []).map((d) => d.id)];
  if (!pengajar.includes(Number(dosenId))) throw new ApiError(400, 'Dosen ini bukan pengajar kelas tersebut');
  const [row] = await KuesionerDosenKelas.findOrCreate({
    where: { jadwalKuliahId: jadwal.id, dosenId: Number(dosenId) },
    defaults: { isiKuesioner: !!isiKuesioner, updatedBy: userId },
  });
  await row.update({ isiKuesioner: !!isiKuesioner, updatedBy: userId });
  return { jadwalKuliahId: jadwal.id, dosenId: Number(dosenId), isiKuesioner: row.isiKuesioner };
};

module.exports = { rekapKehadiranJadwal, getDosenPengajarKelas, listKelasDosen, setIsiKuesioner, getBobotObeKelas, saveBobotObeKelas, ensureKelasDosen, getRealisasiKelas, getRekapKehadiranKelas, getNilaiKelas, saveNilaiKelas, getPesertaKelas, KOMPONEN };
