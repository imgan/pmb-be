const { TarifPembimbing, Jurusan } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { buildWorkbook, parseWorkbookFromBase64, cellString, cellBoolean } = require('../utils/excel');

const includeRelations = [{ model: Jurusan, as: 'jurusan', required: false }];

const EXPORT_COLUMNS = [
  { header: 'Prodi', key: 'jurusan', width: 30 },
  { header: 'Periode', key: 'periode', width: 12 },
  { header: 'Biaya Pembimbing Utama', key: 'biayaPembimbingUtama', width: 22 },
  { header: 'Biaya Pembimbing Pendamping', key: 'biayaPembimbingPendamping', width: 26 },
  { header: 'Biaya Pembimbing Asisten', key: 'biayaPembimbingAsisten', width: 22 },
  { header: 'Biaya Pembimbing Tunggal', key: 'biayaPembimbingTunggal', width: 22 },
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
  biayaPembimbingUtama: ['biayaPembimbingUtama'],
  biayaPembimbingPendamping: ['biayaPembimbingPendamping'],
  biayaPembimbingAsisten: ['biayaPembimbingAsisten'],
  biayaPembimbingTunggal: ['biayaPembimbingTunggal'],
  isActive: ['isActive'],
  jurusan: [{ model: Jurusan, as: 'jurusan' }, 'namaJurusan'],
};

const listTarifPembimbing = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.periode) where.periode = query.periode;
  if (query.jurusanId) where.jurusanId = query.jurusanId;
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true' || query.isActive === true;

  const { rows, count } = await TarifPembimbing.findAndCountAll({
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

const getTarifPembimbingById = async (id) => {
  const item = await TarifPembimbing.findByPk(id, { include: includeRelations });
  if (!item) throw new ApiError(404, 'Data tarif pembimbing tidak ditemukan');
  return item;
};

const createTarifPembimbing = async (payload, actorId) => {
  const item = await TarifPembimbing.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  return getTarifPembimbingById(item.id);
};

const updateTarifPembimbing = async (id, payload, actorId) => {
  const item = await getTarifPembimbingById(id);
  await item.update({ ...payload, updatedBy: actorId });
  return getTarifPembimbingById(id);
};

const deleteTarifPembimbing = async (id) => {
  const item = await getTarifPembimbingById(id);
  await item.destroy();
};

const exportTarifPembimbing = async () => {
  const rows = await TarifPembimbing.findAll({ include: includeRelations, order: [['periode', 'DESC']] });
  const data = rows.map((t) => ({
    jurusan: t.jurusan?.namaJurusan ?? '',
    periode: t.periode,
    biayaPembimbingUtama: t.biayaPembimbingUtama,
    biayaPembimbingPendamping: t.biayaPembimbingPendamping,
    biayaPembimbingAsisten: t.biayaPembimbingAsisten,
    biayaPembimbingTunggal: t.biayaPembimbingTunggal,
    statusAktif: t.isActive ? 'Ya' : 'Tidak',
  }));
  return buildWorkbook('Tarif Pembimbing', EXPORT_COLUMNS, data);
};

const exportTarifPembimbingTemplate = () => {
  const sample = {
    jurusan: 'Nama Prodi (sesuai master data)',
    periode: 2026,
    biayaPembimbingUtama: 500000,
    biayaPembimbingPendamping: 300000,
    biayaPembimbingAsisten: 200000,
    biayaPembimbingTunggal: 700000,
    statusAktif: 'Ya',
  };
  return buildWorkbook('Tarif Pembimbing', EXPORT_COLUMNS, [sample]);
};

/**
 * Boleh MEMBUAT baru sekaligus mengubah yang sudah ada (dicocokkan lewat Prodi + Periode),
 * dipakai untuk migrasi tarif honor pembimbing dari sistem kampus lama.
 */
const importTarifPembimbing = async (fileBase64, actorId) => {
  const rows = await parseWorkbookFromBase64(fileBase64);
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

    const payload = {
      jurusanId: jurusan.id,
      periode,
      biayaPembimbingUtama: cellNumber(data['Biaya Pembimbing Utama']),
      biayaPembimbingPendamping: cellNumber(data['Biaya Pembimbing Pendamping']),
      biayaPembimbingAsisten: cellNumber(data['Biaya Pembimbing Asisten']),
      biayaPembimbingTunggal: cellNumber(data['Biaya Pembimbing Tunggal']),
      isActive: cellBoolean(data['Status Aktif'], true),
      updatedBy: actorId,
    };

    try {
      const existing = await TarifPembimbing.findOne({ where: { jurusanId: jurusan.id, periode } });
      if (existing) {
        await existing.update(payload);
      } else {
        await TarifPembimbing.create({ ...payload, createdBy: actorId });
      }
      successCount += 1;
    } catch (err) {
      errors.push({ row: rowNumber, message: err.message });
    }
  }

  return { successCount, errorCount: errors.length, errors };
};

module.exports = {
  listTarifPembimbing,
  getTarifPembimbingById,
  createTarifPembimbing,
  updateTarifPembimbing,
  deleteTarifPembimbing,
  exportTarifPembimbing,
  exportTarifPembimbingTemplate,
  importTarifPembimbing,
};
