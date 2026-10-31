const { Op } = require('sequelize');
const {
  Mahasiswa,
  Kurikulum,
  MataKuliah,
  NilaiMahasiswa,
  Krs,
  KrsDetail,
  JadwalKuliah,
  Dosen,
  Jurusan,
  KehadiranDosen,
  KehadiranMahasiswa,
  TahunAjaran,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { GRADE_BOBOT } = require('../utils/gradeScale');
const { loadKelompokKode, nilaiDiakuiSet } = require('../utils/ekuivalensiMatkul');
const { formatTahunAjaran } = require('../utils/tahunAjaran');

/**
 * Portal mahasiswa — menu "Data Kampus": Kurikulum prodi, rekap Kehadiran per mata kuliah, dan
 * Hasil Studi (IPS/IPK per semester). Semua data discope ke mahasiswa yang login.
 */

// Nilai di bawah C belum lulus (sama dengan aturan mengulang di KRS & dashboard).
const BATAS_LULUS = GRADE_BOBOT.C;

const getMahasiswa = async (mahasiswaId) => {
  const mahasiswa = await Mahasiswa.findByPk(mahasiswaId, { attributes: ['id', 'jurusanId', 'tahunMasuk'] });
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa tidak ditemukan');
  return mahasiswa;
};

/**
 * Kurikulum prodi mahasiswa per semester + status tiap MK dari nilai yang diakui (termasuk MK
 * ekuivalen hasil konversi kurikulum). Default tahun kurikulum = tahun kurikulum terbaru yang
 * tidak lebih baru dari angkatan (mis. angkatan 2024 -> kurikulum 2023).
 */
const getKurikulum = async (mahasiswaId, query = {}) => {
  const mahasiswa = await getMahasiswa(mahasiswaId);
  // Kurikulum (header) prodi mahasiswa; mata kuliahnya dibaca dari kurikulum terpilih.
  const kurikulumProdi = await Kurikulum.findAll({
    where: { jurusanId: mahasiswa.jurusanId, tahunKurikulum: { [Op.ne]: null } },
    attributes: ['id', 'tahunKurikulum'],
  });
  const tahunList = [...new Set(kurikulumProdi.map((r) => r.tahunKurikulum))].sort((a, b) => b - a);
  if (!tahunList.length) return { tahunKurikulumOptions: [], tahunKurikulum: null, semester: [], ringkasan: { totalSks: 0, sksLulus: 0 } };

  const diminta = Number(query.tahunKurikulum);
  const tahunKurikulum = tahunList.includes(diminta)
    ? diminta
    : (tahunList.find((t) => t <= (mahasiswa.tahunMasuk ?? 0)) ?? tahunList[tahunList.length - 1]);

  const [kurikulum, nilaiList, kelompokOf] = await Promise.all([
    MataKuliah.findAll({
      where: { kurikulumId: kurikulumProdi.filter((k) => k.tahunKurikulum === tahunKurikulum).map((k) => k.id) },
      order: [['semester', 'ASC'], ['kode', 'ASC']],
    }),
    NilaiMahasiswa.findAll({
      where: { mahasiswaId },
      attributes: ['mahasiswaId', 'kodeMataKuliah', 'namaMataKuliah', 'semester', 'grade'],
      raw: true,
    }),
    loadKelompokKode(),
  ]);
  const nilaiByKelompok = new Map([...nilaiDiakuiSet(nilaiList, kelompokOf)].map((n) => [kelompokOf(n.kodeMataKuliah), n]));
  const nilaiByNama = new Map(nilaiList.map((n) => [String(n.namaMataKuliah).trim().toLowerCase(), n]));

  const bySemester = new Map();
  kurikulum.forEach((k) => {
    // Cocokkan lewat kode/ekuivalensi; fallback nama (kode nilai SIAKAD lama bisa beda dengan kurikulum).
    const nilai = nilaiByKelompok.get(kelompokOf(k.kode)) ?? nilaiByNama.get(String(k.mataKuliah).trim().toLowerCase()) ?? null;
    let status = 'BELUM';
    if (nilai) status = (GRADE_BOBOT[nilai.grade] ?? 0) >= BATAS_LULUS ? 'LULUS' : 'MENGULANG';
    const row = {
      kode: k.kode,
      mataKuliah: k.mataKuliah,
      jenisMataKuliah: k.jenisMataKuliah,
      wajib: k.kelompokKurikulum !== 'PILIHAN',
      sksTeori: k.sksTeori,
      sksPraktek: k.sksPraktek + k.sksLab + k.sksSimulasi,
      sksTotal: k.sksTotal,
      status,
      grade: nilai?.grade ?? null,
    };
    const key = k.semester ?? 0;
    bySemester.set(key, [...(bySemester.get(key) ?? []), row]);
  });
  const semester = [...bySemester.entries()]
    .sort((a, b) => (a[0] || 99) - (b[0] || 99))
    .map(([s, mk]) => ({ semester: s || null, totalSks: mk.reduce((sum, m) => sum + m.sksTotal, 0), mataKuliah: mk }));
  const semua = semester.flatMap((s) => s.mataKuliah);
  return {
    tahunKurikulumOptions: tahunList,
    tahunKurikulum,
    semester,
    ringkasan: {
      totalSks: semua.reduce((sum, m) => sum + m.sksTotal, 0),
      sksLulus: semua.filter((m) => m.status === 'LULUS').reduce((sum, m) => sum + m.sksTotal, 0),
    },
  };
};

const namaDosen = (d) => (d ? [d.namaLengkap, d.gelar].filter(Boolean).join(', ') : null);

/**
 * Rekap kehadiran per mata kuliah di KRS satu tahun akademik (default: tahun akademik aktif atau
 * KRS terbaru). Pertemuan = realisasi dosen berstatus HADIR; presensi yang belum tercatat dihitung
 * terpisah (belum ditutup dosen).
 */
const getRekapKehadiran = async (mahasiswaId, query = {}) => {
  const krsList = await Krs.findAll({
    where: { mahasiswaId, status: { [Op.ne]: 'DITOLAK' } },
    include: [{ model: TahunAjaran, as: 'tahunAjaran', required: false }],
    order: [['semester', 'DESC']],
  });
  const tahunAjaranOptions = [];
  krsList.forEach((k) => {
    if (k.tahunAjaran && !tahunAjaranOptions.some((o) => o.id === k.tahunAjaranId)) {
      tahunAjaranOptions.push({ id: k.tahunAjaranId, label: formatTahunAjaran(k.tahunAjaran), semester: k.semester });
    }
  });
  if (!tahunAjaranOptions.length) return { tahunAjaranOptions: [], tahunAjaranId: null, mataKuliah: [], ringkasan: null };

  const aktif = await TahunAjaran.findOne({ where: { isActive: true }, attributes: ['id'] });
  const diminta = Number(query.tahunAjaranId);
  const tahunAjaranId = tahunAjaranOptions.some((o) => o.id === diminta)
    ? diminta
    : (tahunAjaranOptions.find((o) => o.id === aktif?.id) ?? tahunAjaranOptions[0]).id;

  const details = await KrsDetail.findAll({
    include: [
      { model: Krs, as: 'krs', required: true, attributes: ['id'], where: { mahasiswaId, tahunAjaranId, status: { [Op.ne]: 'DITOLAK' } } },
      {
        model: JadwalKuliah,
        as: 'kelasKuliah',
        required: true,
        attributes: ['id', 'kelas', 'kodeMataKuliah', 'namaMataKuliah', 'sks'],
        include: [{ model: Dosen, as: 'dosenKordinator', attributes: ['namaLengkap', 'gelar'], required: false }],
      },
    ],
  });
  const jadwalIds = details.map((d) => d.kelasKuliah.id);
  const pertemuan = jadwalIds.length
    ? await KehadiranDosen.findAll({ where: { jadwalKuliahId: jadwalIds, status: 'HADIR' }, attributes: ['id', 'jadwalKuliahId'], raw: true })
    : [];
  const presensi = pertemuan.length
    ? await KehadiranMahasiswa.findAll({ where: { mahasiswaId, kehadiranDosenId: pertemuan.map((p) => p.id) }, attributes: ['kehadiranDosenId', 'status'], raw: true })
    : [];
  const statusByPertemuan = new Map(presensi.map((p) => [p.kehadiranDosenId, p.status]));

  const mataKuliah = details
    .map((d) => {
      const j = d.kelasKuliah;
      const list = pertemuan.filter((p) => p.jadwalKuliahId === j.id);
      const hitung = { HADIR: 0, IZIN: 0, SAKIT: 0, ALPA: 0 };
      let belumTercatat = 0;
      list.forEach((p) => {
        const s = statusByPertemuan.get(p.id);
        if (s) hitung[s] += 1;
        else belumTercatat += 1;
      });
      return {
        jadwalKuliahId: j.id,
        kodeMataKuliah: j.kodeMataKuliah,
        namaMataKuliah: j.namaMataKuliah,
        kelas: j.kelas,
        sks: j.sks,
        dosen: namaDosen(j.dosenKordinator),
        pertemuan: list.length,
        hadir: hitung.HADIR,
        izin: hitung.IZIN,
        sakit: hitung.SAKIT,
        alpa: hitung.ALPA,
        belumTercatat,
        persen: list.length ? Math.round((hitung.HADIR / list.length) * 1000) / 10 : null,
      };
    })
    .sort((a, b) => a.namaMataKuliah.localeCompare(b.namaMataKuliah));

  const totalPertemuan = mataKuliah.reduce((s, m) => s + m.pertemuan, 0);
  const totalHadir = mataKuliah.reduce((s, m) => s + m.hadir, 0);
  return {
    tahunAjaranOptions,
    tahunAjaranId,
    mataKuliah,
    ringkasan: {
      pertemuan: totalPertemuan,
      hadir: totalHadir,
      persen: totalPertemuan ? Math.round((totalHadir / totalPertemuan) * 1000) / 10 : null,
    },
  };
};


/**
 * Informasi Dosen: daftar dosen aktif beserta tempat/tanggal lahir, kontak (HP, email, alamat),
 * gelar & pendidikan terakhir. Hanya data profil publik — tanpa NIK/NUPTK/data kepegawaian.
 */
const getDaftarDosen = async () => {
  const list = await Dosen.findAll({
    where: { isActive: true },
    attributes: ['id', 'namaLengkap', 'gelar', 'nidn', 'tempatLahir', 'tanggalLahir', 'telpHp', 'noWhatsapp', 'email', 'alamat', 'pendidikanAkhir', 'jenisDosen'],
    include: [{ model: Jurusan, as: 'jurusan', attributes: ['namaJurusan'], required: false }],
    order: [['jenisDosen', 'ASC'], ['namaLengkap', 'ASC']],
  });
  return list.map((d) => ({
    id: d.id,
    namaLengkap: d.namaLengkap,
    gelar: d.gelar,
    nidn: d.nidn,
    tempatLahir: d.tempatLahir,
    tanggalLahir: d.tanggalLahir,
    telpHp: d.telpHp,
    noWhatsapp: d.noWhatsapp,
    email: d.email,
    alamat: d.alamat,
    pendidikanAkhir: d.pendidikanAkhir,
    jenisDosen: d.jenisDosen,
    prodi: d.jurusan?.namaJurusan ?? null,
  }));
};

module.exports = { getKurikulum, getRekapKehadiran, getDaftarDosen };
