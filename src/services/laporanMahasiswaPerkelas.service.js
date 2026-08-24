const ExcelJS = require('exceljs');
const { Op } = require('sequelize');
const { Mahasiswa, MahasiswaBiodata, Jurusan } = require('../models');

const STATUS_MASUK_LABELS = {
  BARU: 'Baru',
  TRANSFER_LUAR: 'Transfer luar',
  TRANSFER_DALAM: 'Transfer dalam',
  TRANSFER_LUAR_KARYAWAN: 'Transfer luar karyawan',
  TRANSFER_DALAM_KARYAWAN: 'Transfer dalam karyawan',
};

/**
 * Jurusan has one row per (namaJurusan x golonganKelas) combination (needed for the PMB
 * registration flow), so the same program studi name can appear multiple times. For this
 * report's "Prodi" filter we only want one entry per distinct name, so dedupe here.
 */
const dedupeProdi = (jurusanRows) => {
  const byName = new Map();
  jurusanRows.forEach((j) => {
    const key = j.namaJurusan.trim().toLowerCase();
    const existing = byName.get(key);
    if (existing) {
      existing.jurusanIds.push(j.id);
      existing.kodeProdi = existing.kodeProdi ?? j.kodeProdi;
    } else {
      byName.set(key, { id: j.id, namaJurusan: j.namaJurusan, kodeProdi: j.kodeProdi, jurusanIds: [j.id] });
    }
  });
  return Array.from(byName.values()).sort((a, b) => a.namaJurusan.localeCompare(b.namaJurusan));
};

const getFilterOptions = async () => {
  const [prodi, kelasRows, waktuRows, tahunRows] = await Promise.all([
    Jurusan.findAll({ attributes: ['id', 'namaJurusan', 'kodeProdi'], order: [['namaJurusan', 'ASC']] }),
    MahasiswaBiodata.findAll({
      attributes: ['kelas'],
      where: { kelas: { [Op.ne]: null } },
      group: ['kelas'],
      order: [['kelas', 'ASC']],
      raw: true,
    }),
    MahasiswaBiodata.findAll({
      attributes: ['waktuKuliah'],
      where: { waktuKuliah: { [Op.ne]: null } },
      group: ['waktuKuliah'],
      order: [['waktuKuliah', 'ASC']],
      raw: true,
    }),
    Mahasiswa.findAll({
      attributes: ['tahunMasuk'],
      group: ['tahunMasuk'],
      order: [['tahunMasuk', 'DESC']],
      raw: true,
    }),
  ]);

  return {
    prodi: dedupeProdi(prodi),
    kelas: kelasRows.map((r) => r.kelas).filter(Boolean),
    waktuKuliah: waktuRows.map((r) => r.waktuKuliah).filter(Boolean),
    tahunMasuk: tahunRows.map((r) => r.tahunMasuk),
  };
};

const buildPerkelasWorkbook = async (query) => {
  const { jurusanId, kelas, waktuKuliah, tahunMasuk } = query;

  const jurusan = jurusanId ? await Jurusan.findByPk(jurusanId) : null;

  const where = {};
  if (jurusanId) {
    // The dropdown only offers one representative id per distinct program studi name (see
    // dedupeProdi), so pull in every Jurusan row sharing that name to avoid silently dropping
    // students who registered under a different golongan kelas of the same program.
    const siblingJurusan = await Jurusan.findAll({
      where: { namaJurusan: jurusan?.namaJurusan ?? '' },
      attributes: ['id'],
      raw: true,
    });
    where.jurusanId = siblingJurusan.length ? siblingJurusan.map((j) => j.id) : jurusanId;
  }
  if (tahunMasuk) where.tahunMasuk = tahunMasuk;

  const biodataWhere = {};
  if (kelas) biodataWhere.kelas = kelas;
  if (waktuKuliah) biodataWhere.waktuKuliah = waktuKuliah;
  const hasBiodataFilter = Object.keys(biodataWhere).length > 0;

  const rows = await Mahasiswa.findAll({
    where,
    include: [
      {
        model: MahasiswaBiodata,
        as: 'biodata',
        where: hasBiodataFilter ? biodataWhere : undefined,
        required: hasBiodataFilter,
      },
    ],
    order: [['namaLengkap', 'ASC']],
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Mahasiswa Per Kelas');

  sheet.columns = [
    { key: 'a', width: 6 },
    { key: 'b', width: 20 },
    { key: 'c', width: 32 },
    { key: 'd', width: 24 },
    { key: 'e', width: 16 },
  ];

  sheet.addRow(['', `Prodi : ${jurusan?.namaJurusan ?? '-'}`]);
  sheet.addRow(['', `Kelas : ${kelas || '-'}`]);
  sheet.addRow(['', `Waktu Kuliah : ${waktuKuliah || '-'}`]);
  sheet.addRow(['', `Tahun Masuk : ${tahunMasuk || '-'}`]);
  sheet.addRow([]);

  const headerRow = sheet.addRow(['No', 'NIM', 'NAMA MAHASISWA', 'STATUS MASUK', 'TTD']);
  headerRow.font = { bold: true };

  rows.forEach((m, index) => {
    sheet.addRow([index + 1, m.nim, m.namaLengkap.toUpperCase(), STATUS_MASUK_LABELS[m.statusMasuk] ?? m.statusMasuk, '']);
  });

  return workbook;
};

module.exports = { getFilterOptions, buildPerkelasWorkbook };
