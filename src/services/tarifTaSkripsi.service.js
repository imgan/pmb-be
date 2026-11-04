const { Op } = require('sequelize');
const { TarifTaSkripsi, Jurusan, TahunTaSkripsi } = require('../models');
const { formatTahunAjaran } = require('../utils/tahunAjaran');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { buildWorkbook, parseWorkbookFromBase64, cellString, cellBoolean } = require('../utils/excel');
const { selaraskanTagihanDariTarif } = require('./pembayaranTaSkripsi.service');

const includeRelations = [
  { model: Jurusan, as: 'jurusan', required: false },
  { model: TahunTaSkripsi, as: 'tahunTaSkripsi', attributes: ['id', 'nama', 'jenisSemester'], required: false },
];

const EXPORT_COLUMNS = [
  { header: 'Prodi', key: 'jurusan', width: 30 },
  { header: 'Tahun TA/Skripsi', key: 'tahunTaSkripsi', width: 22 },
  { header: 'Periode', key: 'periode', width: 12 },
  { header: 'Biaya Pendaftaran', key: 'biayaPendaftaran', width: 20 },
  { header: 'Biaya Perpanjangan', key: 'biayaPerpanjangan', width: 20 },
  { header: 'Status Aktif', key: 'statusAktif', width: 15 },
];

const cellNumber = (value) => {
  const cleaned = cellString(value).replace(/[^0-9-]/g, '');
  if (!cleaned) return 0;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
};

const SORTABLE_COLUMNS = {
  periode: ['periode'],
  tahunTaSkripsi: [{ model: TahunTaSkripsi, as: 'tahunTaSkripsi' }, 'nama'],
  biayaPendaftaran: ['biayaPendaftaran'],
  biayaPerpanjangan: ['biayaPerpanjangan'],
  isActive: ['isActive'],
  jurusan: [{ model: Jurusan, as: 'jurusan' }, 'namaJurusan'],
};

const listTarifTaSkripsi = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.periode) where.periode = query.periode;
  if (query.tahunTaSkripsiId) where.tahunTaSkripsiId = query.tahunTaSkripsiId;
  if (query.jurusanId) where.jurusanId = query.jurusanId;
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true' || query.isActive === true;

  const { rows, count } = await TarifTaSkripsi.findAndCountAll({
    where,
    include: includeRelations,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['periode', 'DESC']]),
    subQuery: false,
    distinct: true,
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getTarifTaSkripsiById = async (id) => {
  const item = await TarifTaSkripsi.findByPk(id, { include: includeRelations });
  if (!item) throw new ApiError(404, 'Data tarif TA/Skripsi tidak ditemukan');
  return item;
};

/**
 * Satu prodi hanya boleh punya satu tarif per Tahun TA/Skripsi. Prodi dibandingkan lewat kode prodi, karena satu prodi
 * punya beberapa baris jurusan (golongan kelas) dan Generate Tagihan juga mencocokkan tarif lewat kode prodi.
 */
const assertTidakDuplikat = async ({ jurusanId, tahunTaSkripsiId }, kecualiId = null) => {
  if (!jurusanId || !tahunTaSkripsiId) return;
  const jurusan = await Jurusan.findByPk(jurusanId, { attributes: ['id', 'kodeProdi', 'namaJurusan'] });
  if (!jurusan) throw new ApiError(404, 'Prodi tidak ditemukan');
  const prodiSama = jurusan.kodeProdi ? { kodeProdi: jurusan.kodeProdi } : { id: jurusan.id };
  const ada = await TarifTaSkripsi.findOne({
    where: { tahunTaSkripsiId, ...(kecualiId ? { id: { [Op.ne]: kecualiId } } : {}) },
    include: [
      { model: Jurusan, as: 'jurusan', attributes: [], where: prodiSama, required: true },
      { model: TahunTaSkripsi, as: 'tahunTaSkripsi', attributes: ['nama', 'jenisSemester'], required: false },
    ],
  });
  if (ada) {
    const tahun = ada.tahunTaSkripsi ? `${ada.tahunTaSkripsi.nama} ${ada.tahunTaSkripsi.jenisSemester ?? ''}`.trim() : 'ini';
    throw new ApiError(409, `Tarif ${jurusan.namaJurusan} untuk Tahun TA/Skripsi ${tahun} sudah ada. Ubah tarif yang sudah ada, jangan input dua kali.`);
  }
};

const createTarifTaSkripsi = async (payload, actorId) => {
  await assertTidakDuplikat(payload);
  const item = await TarifTaSkripsi.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  return getTarifTaSkripsiById(item.id);
};

/** Tagihan mahasiswa hasil generate dari tarif ini ikut ditimpa ke nominal baru (lihat selaraskanTagihanDariTarif). */
const updateTarifTaSkripsi = async (id, payload, actorId) => {
  const item = await getTarifTaSkripsiById(id);
  await assertTidakDuplikat({ jurusanId: payload.jurusanId ?? item.jurusanId, tahunTaSkripsiId: payload.tahunTaSkripsiId !== undefined ? payload.tahunTaSkripsiId : item.tahunTaSkripsiId }, item.id);
  await item.update({ ...payload, updatedBy: actorId });
  const tagihanDisesuaikan = await selaraskanTagihanDariTarif(id, actorId);
  return { ...(await getTarifTaSkripsiById(id)).toJSON(), tagihanDisesuaikan };
};

const deleteTarifTaSkripsi = async (id) => {
  const item = await getTarifTaSkripsiById(id);
  await item.destroy();
};

const exportTarifTaSkripsi = async () => {
  const rows = await TarifTaSkripsi.findAll({ include: includeRelations, order: [['periode', 'DESC']] });
  const data = rows.map((t) => ({
    jurusan: t.jurusan?.namaJurusan ?? '',
    tahunTaSkripsi: formatTahunAjaran(t.tahunTaSkripsi) ?? '',
    periode: t.periode,
    biayaPendaftaran: t.biayaPendaftaran,
    biayaPerpanjangan: t.biayaPerpanjangan,
    statusAktif: t.isActive ? 'Ya' : 'Tidak',
  }));
  return buildWorkbook('Tarif TA Skripsi', EXPORT_COLUMNS, data);
};

const exportTarifTaSkripsiTemplate = () => {
  const sample = {
    jurusan: 'Nama Prodi (sesuai master data)',
    tahunTaSkripsi: '2026/2027 GANJIL',
    periode: 2026,
    biayaPendaftaran: 1000000,
    biayaPerpanjangan: 250000,
    statusAktif: 'Ya',
  };
  return buildWorkbook('Tarif TA Skripsi', EXPORT_COLUMNS, [sample]);
};

/**
 * Boleh MEMBUAT baru sekaligus mengubah yang sudah ada (dicocokkan lewat Prodi + Periode),
 * dipakai untuk migrasi tarif TA/skripsi dari sistem kampus lama.
 */
/** "2026/2027 GANJIL" (format export) -> id Tahun TA/Skripsi; tanpa semester dicocokkan lewat nama saja. */
const resolveTahunId = (tahunList, text) => {
  const [nama, jenis] = text.trim().toUpperCase().split(/\s+/);
  const match = tahunList.find((t) => t.nama === nama && (!jenis || t.jenisSemester === jenis));
  return match?.id ?? null;
};

const importTarifTaSkripsi = async (fileBase64, actorId) => {
  const rows = await parseWorkbookFromBase64(fileBase64);
  const tahunList = await TahunTaSkripsi.findAll({ attributes: ['id', 'nama', 'jenisSemester'] });
  const errors = [];
  let successCount = 0;

  for (const { rowNumber, data } of rows) {
    const jurusanNama = cellString(data['Prodi']);
    if (!jurusanNama) {
      errors.push({ row: rowNumber, message: 'Prodi wajib diisi' });
      continue;
    }
    const jurusan = await Jurusan.findOne({ where: { namaJurusan: jurusanNama } });
    if (!jurusan) {
      errors.push({ row: rowNumber, message: `Prodi "${jurusanNama}" tidak ditemukan` });
      continue;
    }

    const periode = cellNumber(data['Periode']);
    if (!periode) {
      errors.push({ row: rowNumber, message: 'Periode wajib diisi' });
      continue;
    }

    // Kolom "Tahun Akademik" dari template lama tetap dibaca.
    const tahunText = cellString(data['Tahun TA/Skripsi'] ?? data['Tahun Akademik']);
    const tahunTaSkripsiId = tahunText ? resolveTahunId(tahunList, tahunText) : null;
    if (tahunText && !tahunTaSkripsiId) {
      errors.push({ row: rowNumber, message: `Tahun TA/Skripsi "${tahunText}" tidak ditemukan (format: 2026/2027 GANJIL)` });
      continue;
    }

    const payload = {
      jurusanId: jurusan.id,
      periode,
      ...(tahunText ? { tahunTaSkripsiId } : {}),
      biayaPendaftaran: cellNumber(data['Biaya Pendaftaran']),
      biayaPerpanjangan: cellNumber(data['Biaya Perpanjangan']),
      isActive: cellBoolean(data['Status Aktif'], true),
      updatedBy: actorId,
    };

    try {
      const existing = await TarifTaSkripsi.findOne({ where: { jurusanId: jurusan.id, periode } });
      await assertTidakDuplikat({ jurusanId: jurusan.id, tahunTaSkripsiId: payload.tahunTaSkripsiId ?? existing?.tahunTaSkripsiId }, existing?.id);
      if (existing) {
        await existing.update(payload);
        await selaraskanTagihanDariTarif(existing.id, actorId);
      } else {
        await TarifTaSkripsi.create({ ...payload, createdBy: actorId });
      }
      successCount += 1;
    } catch (err) {
      errors.push({ row: rowNumber, message: err.message });
    }
  }

  return { successCount, errorCount: errors.length, errors };
};

module.exports = {
  listTarifTaSkripsi,
  getTarifTaSkripsiById,
  createTarifTaSkripsi,
  updateTarifTaSkripsi,
  deleteTarifTaSkripsi,
  exportTarifTaSkripsi,
  exportTarifTaSkripsiTemplate,
  importTarifTaSkripsi,
};
