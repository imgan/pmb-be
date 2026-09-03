const { TarifTaSkripsi, Jurusan } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { buildWorkbook, parseWorkbookFromBase64, cellString, cellBoolean } = require('../utils/excel');

const includeRelations = [{ model: Jurusan, as: 'jurusan', required: false }];

const EXPORT_COLUMNS = [
  { header: 'Prodi', key: 'jurusan', width: 30 },
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
  biayaPendaftaran: ['biayaPendaftaran'],
  biayaPerpanjangan: ['biayaPerpanjangan'],
  isActive: ['isActive'],
  jurusan: [{ model: Jurusan, as: 'jurusan' }, 'namaJurusan'],
};

const listTarifTaSkripsi = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.periode) where.periode = query.periode;
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

const createTarifTaSkripsi = async (payload, actorId) => {
  const item = await TarifTaSkripsi.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  return getTarifTaSkripsiById(item.id);
};

const updateTarifTaSkripsi = async (id, payload, actorId) => {
  const item = await getTarifTaSkripsiById(id);
  await item.update({ ...payload, updatedBy: actorId });
  return getTarifTaSkripsiById(id);
};

const deleteTarifTaSkripsi = async (id) => {
  const item = await getTarifTaSkripsiById(id);
  await item.destroy();
};

const exportTarifTaSkripsi = async () => {
  const rows = await TarifTaSkripsi.findAll({ include: includeRelations, order: [['periode', 'DESC']] });
  const data = rows.map((t) => ({
    jurusan: t.jurusan?.namaJurusan ?? '',
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
const importTarifTaSkripsi = async (fileBase64, actorId) => {
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
      biayaPendaftaran: cellNumber(data['Biaya Pendaftaran']),
      biayaPerpanjangan: cellNumber(data['Biaya Perpanjangan']),
      isActive: cellBoolean(data['Status Aktif'], true),
      updatedBy: actorId,
    };

    try {
      const existing = await TarifTaSkripsi.findOne({ where: { jurusanId: jurusan.id, periode } });
      if (existing) {
        await existing.update(payload);
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
