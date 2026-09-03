const { Op } = require('sequelize');
const { sequelize, TahunAjaran, Mahasiswa } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { resolveSemesterMahasiswa, MAX_SEMESTER_WAJAR } = require('../utils/hitungSemester');

const SORTABLE_COLUMNS = {
  nama: ['nama'],
  tahunMulai: ['tahunMulai'],
  tahunSelesai: ['tahunSelesai'],
  isActive: ['isActive'],
};

const listTahunAjaran = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where.nama = { [Op.like]: `%${query.search}%` };
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive === 'true' || query.isActive === true;
  }

  const { rows, count } = await TahunAjaran.findAndCountAll({
    where,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['tahunMulai', 'DESC']]),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getTahunAjaranById = async (id) => {
  const tahunAjaran = await TahunAjaran.findByPk(id);
  if (!tahunAjaran) throw new ApiError(404, 'Tahun ajaran not found');
  return tahunAjaran;
};

const ensureUniqueNama = async (nama, excludeId) => {
  const where = { nama };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  const existing = await TahunAjaran.findOne({ where });
  if (existing) throw new ApiError(409, 'Nama tahun ajaran sudah digunakan');
};

const createTahunAjaran = async (payload, actorId) => {
  await ensureUniqueNama(payload.nama);
  return TahunAjaran.create({ ...payload, createdBy: actorId, updatedBy: actorId });
};

const updateTahunAjaran = async (id, payload, actorId) => {
  const tahunAjaran = await getTahunAjaranById(id);
  if (payload.nama) {
    await ensureUniqueNama(payload.nama, id);
  }
  await tahunAjaran.update({ ...payload, updatedBy: actorId });
  return tahunAjaran;
};

const deleteTahunAjaran = async (id, actorId) => {
  const tahunAjaran = await getTahunAjaranById(id);
  await tahunAjaran.update({ isDelete: true, updatedBy: actorId });
};

/**
 * "Naikkan semester" di sistem ini pakai pendekatan calculated (bukan kolom semester yang
 * di-increment) — semester mahasiswa selalu dihitung on-the-fly dari periode masuk vs periode
 * tahun ajaran yang aktif (lihat mahasiswaPortal.service.js#getSemesterBerjalan &
 * utils/hitungSemester.js). Jadi TRIGGER kenaikan semester ya perpindahan tahun ajaran aktif
 * ini sendiri — begitu tahun ajaran baru diaktifkan, semester seluruh mahasiswa otomatis naik
 * tanpa perlu di-update satu-satu.
 *
 * Yang dilakukan fungsi ini SEKALI per transisi periode (bukan setiap kali dipanggil — memanggil
 * ulang pada tahun ajaran yang sudah aktif ditolak, supaya jumlahSemesterCuti di bawah tidak
 * ke-increment berkali-kali untuk transisi yang sama):
 *  1. Pastikan hanya SATU tahun ajaran yang aktif pada satu waktu (sebelumnya tidak dipaksakan).
 *  2. Mahasiswa yang sedang cuti (statusKeluar = CUTI) di-skip dari "kenaikan" — TAPI
 *     jumlahSemesterCuti mereka otomatis ditambah 1 supaya ke-track otomatis tiap periode
 *     cuti dilalui, tidak lagi mengandalkan admin menghitung manual.
 *  3. Kembalikan laporan dampaknya: berapa mahasiswa aktif, siapa yang cuti-counternya baru
 *     ditambah, dan siapa saja yang semester barunya sudah melebihi batas wajar masa studi —
 *     supaya BAAK/prodi bisa meninjau manual (evaluasi DO dsb), BUKAN otomatis mengubah status
 *     mahasiswa manapun.
 */
const activateTahunAjaran = async (id, actorId) => {
  const tahunAjaran = await getTahunAjaranById(id);
  const sebelumnyaAktif = await TahunAjaran.findOne({ where: { isActive: true } });
  if (sebelumnyaAktif && sebelumnyaAktif.id === tahunAjaran.id) {
    throw new ApiError(400, 'Tahun ajaran ini sudah aktif');
  }

  await sequelize.transaction(async (transaction) => {
    await TahunAjaran.update(
      { isActive: false, updatedBy: actorId },
      { where: { isActive: true, id: { [Op.ne]: id } }, transaction }
    );
    await tahunAjaran.update({ isActive: true, updatedBy: actorId }, { transaction });
  });

  // Mahasiswa sedang cuti: jumlahSemesterCuti otomatis bertambah 1 untuk periode yang baru saja
  // dilalui, dilakukan sebagai satu bulk update (bukan loop per-mahasiswa).
  const mahasiswaCuti = await Mahasiswa.findAll({
    where: { isActive: true, statusKeluar: 'CUTI' },
    attributes: ['id', 'nim', 'namaLengkap', 'jumlahSemesterCuti'],
  });
  if (mahasiswaCuti.length) {
    await Mahasiswa.increment('jumlahSemesterCuti', {
      by: 1,
      where: { id: mahasiswaCuti.map((m) => m.id) },
    });
  }
  const cutiDiproses = mahasiswaCuti
    .map((m) => ({ id: m.id, nim: m.nim, namaLengkap: m.namaLengkap, jumlahSemesterCutiBaru: m.jumlahSemesterCuti + 1 }))
    .sort((a, b) => a.nim.localeCompare(b.nim));

  const mahasiswaAktif = await Mahasiswa.findAll({
    where: { isActive: true, statusKeluar: null },
    // required: false wajib — tahunAjaranId nullable (lihat catatan sama di jadwalKuliah.service.js
    // & mahasiswaPortal.service.js), tanpa ini mahasiswa tanpa tahunAjaranId hilang dari hasil.
    include: [{ model: TahunAjaran, as: 'tahunAjaran', required: false }],
  });

  const melebihiMasaStudi = mahasiswaAktif
    .map((mhs) => ({
      id: mhs.id,
      nim: mhs.nim,
      namaLengkap: mhs.namaLengkap,
      semester: resolveSemesterMahasiswa(mhs, tahunAjaran),
    }))
    .filter((mhs) => mhs.semester > MAX_SEMESTER_WAJAR)
    .sort((a, b) => b.semester - a.semester);

  return {
    tahunAjaran: await getTahunAjaranById(id),
    totalMahasiswaAktif: mahasiswaAktif.length,
    maxSemesterWajar: MAX_SEMESTER_WAJAR,
    cutiDiproses,
    melebihiMasaStudi,
  };
};

module.exports = {
  listTahunAjaran,
  getTahunAjaranById,
  createTahunAjaran,
  updateTahunAjaran,
  deleteTahunAjaran,
  activateTahunAjaran,
};
