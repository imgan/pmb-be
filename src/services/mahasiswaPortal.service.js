const { Op } = require('sequelize');
const {
  Krs,
  KrsDetail,
  JadwalKuliah,
  Dosen,
  MataKuliah,
  Mahasiswa,
  NilaiMahasiswa,
  TahunAjaran,
  SuratKeterangan,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { getCetakData } = require('./suratKeterangan.service');
const { buildSuratPdf } = require('./suratKeteranganPdf.service');
const { assertSksQuota, getIpSemesterSebelumnya, maxSksForSemester } = require('../utils/sksQuota');
const { assertNoConflict } = require('../utils/krsConflict');
const { resolveSemesterMahasiswa } = require('../utils/hitungSemester');
const { GRADE_BOBOT } = require('../utils/gradeScale');

// Semua query di service ini WAJIB discope ke mahasiswaId milik mahasiswa yang sedang login
// (req.mahasiswa.id, diisi oleh mahasiswaAuth.middleware.js) — mahasiswa tidak boleh
// melihat/mengubah data mahasiswa lain, dan itu tidak boleh cuma mengandalkan parameter dari client.

const detailInclude = {
  model: KrsDetail,
  as: 'detailList',
  include: [
    {
      model: JadwalKuliah,
      as: 'kelasKuliah',
      include: [
        { model: Dosen, as: 'dosenKordinator' },
        { model: MataKuliah, as: 'mataKuliah' },
      ],
    },
  ],
};

const withTotalSks = (krs) => {
  const json = krs.toJSON ? krs.toJSON() : krs;
  const totalSks = (json.detailList ?? []).reduce((sum, d) => sum + (d.kelasKuliah?.sks ?? 0), 0);
  return { ...json, totalSks };
};

const getTahunAjaranAktif = async () => TahunAjaran.findOne({ where: { isActive: true } });

/**
 * Semester KRS mahasiswa TIDAK boleh dipilih manual — dihitung otomatis dari periode masuk
 * (tahunMasuk + jenisSemester tahun ajaran saat mahasiswa terdaftar) vs periode tahun ajaran
 * yang sedang aktif sekarang, dibedakan formulanya untuk mahasiswa baru vs transfer
 * berdasarkan statusMasuk. Lihat pmb-be/src/utils/hitungSemester.js untuk rumus lengkapnya.
 */
const getSemesterBerjalan = async (mahasiswaId) => {
  const [mahasiswa, tahunAjaranAktif] = await Promise.all([
    // required: false wajib eksplisit — tahunAjaranId nullable, tanpa ini Sequelize men-default
    // belongsTo tunggal ini jadi INNER JOIN sehingga mahasiswa tanpa tahunAjaranId hilang dari
    // hasil (lihat catatan yang sama di jadwalKuliah.service.js).
    Mahasiswa.findByPk(mahasiswaId, { include: [{ model: TahunAjaran, as: 'tahunAjaran', required: false }] }),
    getTahunAjaranAktif(),
  ]);
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa tidak ditemukan');
  if (!tahunAjaranAktif) throw new ApiError(400, 'Belum ada tahun ajaran aktif');

  const semester = resolveSemesterMahasiswa(mahasiswa, tahunAjaranAktif);

  return { semester, statusMasuk: mahasiswa.statusMasuk, tahunAjaranAktif };
};

const listJadwalTersedia = async (query) => {
  const where = { isActive: true };
  if (query.tahunAjaranId) where.tahunAjaranId = query.tahunAjaranId;
  if (query.semester) {
    // Sama seperti listJadwalKuliah (BAAK): jangan buang kelas yang belum ditag semester-nya,
    // supaya mahasiswa tetap bisa mengambil banyak mata kuliah walau datanya belum lengkap.
    where.semester = { [Op.or]: [{ [Op.eq]: query.semester }, { [Op.is]: null }] };
  }

  return JadwalKuliah.findAll({
    where,
    include: [
      { model: Dosen, as: 'dosenKordinator' },
      { model: MataKuliah, as: 'mataKuliah' },
    ],
    order: [['namaMataKuliah', 'ASC']],
  });
};

const getKuotaSks = async (mahasiswaId, semester) => {
  const ip = await getIpSemesterSebelumnya(mahasiswaId, semester);
  return { ipSemesterSebelumnya: ip, maxSks: maxSksForSemester(semester, ip) };
};

const listKrs = async (mahasiswaId, query) => {
  const where = { mahasiswaId };
  if (query.tahunAjaranId) where.tahunAjaranId = query.tahunAjaranId;
  if (query.semester) where.semester = query.semester;

  const rows = await Krs.findAll({
    where,
    include: [{ model: TahunAjaran, as: 'tahunAjaran' }, detailInclude],
    order: [['id', 'DESC']],
  });
  return rows.map(withTotalSks);
};

const getKrsOwned = async (mahasiswaId, id) => {
  const krs = await Krs.findOne({
    where: { id, mahasiswaId },
    include: [{ model: TahunAjaran, as: 'tahunAjaran' }, detailInclude],
  });
  if (!krs) throw new ApiError(404, 'KRS tidak ditemukan');
  return krs;
};

const saveKrsDraft = async (mahasiswaId, payload) => {
  const { tahunAjaranId, jadwalKuliahIds = [] } = payload;
  // Semester TIDAK diambil dari client — dihitung otomatis supaya tidak bisa dipilih manual.
  const { semester } = await getSemesterBerjalan(mahasiswaId);

  await assertNoConflict(jadwalKuliahIds);

  let krs = await Krs.findOne({ where: { mahasiswaId, tahunAjaranId, semester } });
  if (krs && krs.status !== 'DRAFT') {
    throw new ApiError(400, 'KRS untuk semester ini sudah diajukan dan tidak dapat diubah');
  }
  if (!krs) {
    krs = await Krs.create({ mahasiswaId, tahunAjaranId, semester, status: 'DRAFT' });
  }

  await KrsDetail.destroy({ where: { krsId: krs.id } });
  if (jadwalKuliahIds.length) {
    await KrsDetail.bulkCreate(jadwalKuliahIds.map((jadwalKuliahId) => ({ krsId: krs.id, jadwalKuliahId })));
  }

  return getKrsOwned(mahasiswaId, krs.id);
};

const ajukanKrs = async (mahasiswaId, id) => {
  const krs = await Krs.findOne({ where: { id, mahasiswaId } });
  if (!krs) throw new ApiError(404, 'KRS tidak ditemukan');
  if (krs.status !== 'DRAFT') throw new ApiError(400, 'KRS ini sudah diajukan sebelumnya');

  const details = await KrsDetail.findAll({ where: { krsId: krs.id } });
  if (!details.length) throw new ApiError(400, 'Pilih minimal satu mata kuliah sebelum mengajukan KRS');

  await assertSksQuota(mahasiswaId, krs.semester, details.map((d) => d.jadwalKuliahId));

  await krs.update({ status: 'DIAJUKAN' });
  return getKrsOwned(mahasiswaId, krs.id);
};

const listNilai = async (mahasiswaId, query) => {
  const where = { mahasiswaId };
  if (query.semester) where.semester = Number(query.semester);

  const nilaiList = await NilaiMahasiswa.findAll({
    where,
    order: [['semester', 'ASC'], ['kodeMataKuliah', 'ASC']],
  });

  const bySemester = new Map();
  nilaiList.forEach((n) => {
    const bobot = GRADE_BOBOT[n.grade] ?? 0;
    const mutu = Math.round(bobot * n.sks * 100) / 100;
    const entry = {
      kodeMataKuliah: n.kodeMataKuliah,
      namaMataKuliah: n.namaMataKuliah,
      sks: n.sks,
      nilai: n.nilai,
      grade: n.grade,
      bobot,
      mutu,
    };
    const list = bySemester.get(n.semester) ?? [];
    list.push(entry);
    bySemester.set(n.semester, list);
  });

  return [...bySemester.entries()].map(([semester, nilai]) => {
    const totalSks = nilai.reduce((sum, n) => sum + n.sks, 0);
    const totalMutu = nilai.reduce((sum, n) => sum + n.mutu, 0);
    const ipSemester = totalSks > 0 ? Math.round((totalMutu / totalSks) * 100) / 100 : 0;
    return { semester, nilai, totalSks, totalMutu, ipSemester };
  });
};

const getTranskrip = async (mahasiswaId) => {
  const perSemester = await listNilai(mahasiswaId, {});
  const totalSks = perSemester.reduce((sum, s) => sum + s.totalSks, 0);
  const totalMutu = perSemester.reduce((sum, s) => sum + s.totalMutu, 0);
  const ipk = totalSks > 0 ? Math.round((totalMutu / totalSks) * 100) / 100 : 0;
  return { perSemester, totalSks, ipk };
};

const listSuratKeterangan = async (mahasiswaId) =>
  SuratKeterangan.findAll({ where: { mahasiswaId }, order: [['id', 'DESC']] });

const createSuratKeterangan = async (mahasiswaId, payload) =>
  SuratKeterangan.create({
    ...payload,
    mahasiswaId,
    tanggalInput: new Date(),
    status: 'DIAJUKAN',
  });

const getSuratKeteranganPdf = async (mahasiswaId, id) => {
  const surat = await SuratKeterangan.findOne({ where: { id, mahasiswaId } });
  if (!surat) throw new ApiError(404, 'Pengajuan surat tidak ditemukan');
  if (surat.status !== 'DISETUJUI') {
    throw new ApiError(400, 'Surat belum disetujui BAAK dan belum bisa dicetak');
  }

  const data = await getCetakData(id);
  return { doc: buildSuratPdf(data), filename: `surat-keterangan-${data.mahasiswa.nim}.pdf` };
};

module.exports = {
  getTahunAjaranAktif,
  getSemesterBerjalan,
  listJadwalTersedia,
  getKuotaSks,
  listKrs,
  getKrsOwned,
  saveKrsDraft,
  ajukanKrs,
  listNilai,
  getTranskrip,
  listSuratKeterangan,
  createSuratKeterangan,
  getSuratKeteranganPdf,
};
