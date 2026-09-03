const { Op } = require('sequelize');
const { TarifLain } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { buildWorkbook, parseWorkbookFromBase64, cellString, cellBoolean } = require('../utils/excel');

const EXPORT_COLUMNS = [
  { header: 'Kode Biaya', key: 'kodeBiaya', width: 20 },
  { header: 'Tahun Angkatan', key: 'tahunMasuk', width: 15 },
  { header: 'Biaya', key: 'biaya', width: 18 },
  { header: 'Keterangan', key: 'keterangan', width: 30 },
  { header: 'Status Aktif', key: 'statusAktif', width: 15 },
];

const cellNumber = (value) => {
  const cleaned = cellString(value).replace(/[^0-9-]/g, '');
  if (!cleaned) return 0;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
};

const SORTABLE_COLUMNS = {
  kodeBiaya: ['kodeBiaya'],
  tahunMasuk: ['tahunMasuk'],
  biaya: ['biaya'],
  isActive: ['isActive'],
};

const listTarifLain = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where[Op.or] = [
      { kodeBiaya: { [Op.like]: `%${query.search}%` } },
      { keterangan: { [Op.like]: `%${query.search}%` } },
    ];
  }
  if (query.tahunMasuk) where.tahunMasuk = query.tahunMasuk;
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true' || query.isActive === true;

  const { rows, count } = await TarifLain.findAndCountAll({
    where,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['tahunMasuk', 'DESC'], ['kodeBiaya', 'ASC']]),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getTarifLainById = async (id) => {
  const item = await TarifLain.findByPk(id);
  if (!item) throw new ApiError(404, 'Data tarif lain tidak ditemukan');
  return item;
};

const createTarifLain = async (payload, actorId) => {
  return TarifLain.create({ ...payload, createdBy: actorId, updatedBy: actorId });
};

const updateTarifLain = async (id, payload, actorId) => {
  const item = await getTarifLainById(id);
  await item.update({ ...payload, updatedBy: actorId });
  return item;
};

const deleteTarifLain = async (id) => {
  const item = await getTarifLainById(id);
  await item.destroy();
};

const exportTarifLain = async () => {
  const rows = await TarifLain.findAll({ order: [['tahunMasuk', 'DESC'], ['kodeBiaya', 'ASC']] });
  const data = rows.map((t) => ({
    kodeBiaya: t.kodeBiaya,
    tahunMasuk: t.tahunMasuk,
    biaya: t.biaya,
    keterangan: t.keterangan ?? '',
    statusAktif: t.isActive ? 'Ya' : 'Tidak',
  }));
  return buildWorkbook('Tarif Lain', EXPORT_COLUMNS, data);
};

const exportTarifLainTemplate = () => {
  const sample = {
    kodeBiaya: 'SAP',
    tahunMasuk: 2026,
    biaya: 250000,
    keterangan: 'SAP Overview',
    statusAktif: 'Ya',
  };
  return buildWorkbook('Tarif Lain', EXPORT_COLUMNS, [sample]);
};

/**
 * Boleh MEMBUAT baru sekaligus mengubah yang sudah ada (dicocokkan lewat Kode Biaya + Tahun
 * Angkatan), dipakai untuk migrasi tarif biaya lain dari sistem kampus lama.
 */
const importTarifLain = async (fileBase64, actorId) => {
  const rows = await parseWorkbookFromBase64(fileBase64);
  const errors = [];
  let successCount = 0;

  for (const { rowNumber, data } of rows) {
    const kodeBiaya = cellString(data['Kode Biaya']);
    if (!kodeBiaya) {
      errors.push({ row: rowNumber, message: 'Kode Biaya wajib diisi' });
      continue;
    }
    const tahunMasuk = cellNumber(data['Tahun Angkatan']);
    if (!tahunMasuk) {
      errors.push({ row: rowNumber, message: 'Tahun Angkatan wajib diisi' });
      continue;
    }

    const payload = {
      kodeBiaya,
      tahunMasuk,
      biaya: cellNumber(data['Biaya']),
      keterangan: cellString(data['Keterangan']) || null,
      isActive: cellBoolean(data['Status Aktif'], true),
      updatedBy: actorId,
    };

    try {
      const existing = await TarifLain.findOne({ where: { kodeBiaya, tahunMasuk } });
      if (existing) {
        await existing.update(payload);
      } else {
        await TarifLain.create({ ...payload, createdBy: actorId });
      }
      successCount += 1;
    } catch (err) {
      errors.push({ row: rowNumber, message: err.message });
    }
  }

  return { successCount, errorCount: errors.length, errors };
};

module.exports = {
  listTarifLain,
  getTarifLainById,
  createTarifLain,
  updateTarifLain,
  deleteTarifLain,
  exportTarifLain,
  exportTarifLainTemplate,
  importTarifLain,
};
