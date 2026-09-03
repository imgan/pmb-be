const { TarifKuliah, Jurusan } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { buildWorkbook, parseWorkbookFromBase64, cellString } = require('../utils/excel');
const { STATUS_BELAJAR } = require('../validations/tarifKuliah.validation');

const includeRelations = [{ model: Jurusan, as: 'jurusan', required: false }];

const EXPORT_COLUMNS = [
  { header: 'Prodi', key: 'jurusan', width: 30 },
  { header: 'Tahun Angkatan', key: 'tahunAngkatan', width: 15 },
  { header: 'Semester', key: 'semester', width: 12 },
  { header: 'Biaya SKS', key: 'biayaSks', width: 18 },
  { header: 'Biaya BPP', key: 'biayaBpp', width: 18 },
  { header: 'Biaya SPP', key: 'biayaSpp', width: 18 },
  { header: 'Status Belajar', key: 'statusBelajar', width: 18 },
  { header: 'Status Aktif', key: 'statusAktif', width: 15 },
];

const cellNumber = (value) => {
  const cleaned = cellString(value).replace(/[^0-9-]/g, '');
  if (!cleaned) return 0;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
};

const SORTABLE_COLUMNS = {
  tahunAngkatan: ['tahunAngkatan'],
  semester: ['semester'],
  biayaSks: ['biayaSks'],
  biayaBpp: ['biayaBpp'],
  biayaSpp: ['biayaSpp'],
  statusBelajar: ['statusBelajar'],
  isActive: ['isActive'],
  jurusan: [{ model: Jurusan, as: 'jurusan' }, 'namaJurusan'],
};

const listTarifKuliah = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.tahunAngkatan) where.tahunAngkatan = query.tahunAngkatan;
  if (query.jurusanId) where.jurusanId = query.jurusanId;
  if (query.semester) where.semester = query.semester;
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true' || query.isActive === true;

  const { rows, count } = await TarifKuliah.findAndCountAll({
    where,
    include: includeRelations,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [
      ['tahunAngkatan', 'DESC'],
      ['semester', 'DESC'],
    ]),
    subQuery: false,
    distinct: true,
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getTarifKuliahById = async (id) => {
  const item = await TarifKuliah.findByPk(id, { include: includeRelations });
  if (!item) throw new ApiError(404, 'Data tarif kuliah tidak ditemukan');
  return item;
};

const createTarifKuliah = async (payload, actorId) => {
  const item = await TarifKuliah.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  return getTarifKuliahById(item.id);
};

const updateTarifKuliah = async (id, payload, actorId) => {
  const item = await getTarifKuliahById(id);
  await item.update({ ...payload, updatedBy: actorId });
  return getTarifKuliahById(id);
};

const deleteTarifKuliah = async (id) => {
  const item = await getTarifKuliahById(id);
  await item.destroy();
};

const exportTarifKuliah = async () => {
  const rows = await TarifKuliah.findAll({
    include: includeRelations,
    order: [['tahunAngkatan', 'DESC'], ['semester', 'DESC']],
  });
  const data = rows.map((t) => ({
    jurusan: t.jurusan?.namaJurusan ?? '',
    tahunAngkatan: t.tahunAngkatan,
    semester: t.semester,
    biayaSks: t.biayaSks,
    biayaBpp: t.biayaBpp,
    biayaSpp: t.biayaSpp,
    statusBelajar: t.statusBelajar,
    statusAktif: t.isActive ? 'Ya' : 'Tidak',
  }));
  return buildWorkbook('Tarif Kuliah', EXPORT_COLUMNS, data);
};

const exportTarifKuliahTemplate = () => {
  const sample = {
    jurusan: 'Nama Prodi (sesuai master data)',
    tahunAngkatan: 2026,
    semester: 1,
    biayaSks: 150000,
    biayaBpp: 500000,
    biayaSpp: 1500000,
    statusBelajar: STATUS_BELAJAR.join(' / '),
    statusAktif: 'Ya',
  };
  return buildWorkbook('Tarif Kuliah', EXPORT_COLUMNS, [sample]);
};

/**
 * Sama seperti import jurusan: boleh MEMBUAT baru sekaligus mengubah yang sudah ada
 * (dicocokkan lewat kombinasi Prodi + Tahun Angkatan + Semester + Status Belajar), dipakai
 * untuk migrasi tarif kuliah dari sistem kampus lama.
 */
const importTarifKuliah = async (fileBase64, actorId) => {
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

    const tahunAngkatan = cellNumber(data['Tahun Angkatan']);
    const semester = cellNumber(data['Semester']);
    if (!tahunAngkatan) {
      errors.push({ row: rowNumber, message: 'Tahun Angkatan wajib diisi' });
      continue;
    }
    if (!semester) {
      errors.push({ row: rowNumber, message: 'Semester wajib diisi' });
      continue;
    }

    const statusBelajarRaw = cellString(data['Status Belajar']).toUpperCase();
    const statusBelajar = STATUS_BELAJAR.find((s) => s.toUpperCase() === statusBelajarRaw);
    if (!statusBelajar) {
      errors.push({
        row: rowNumber,
        message: `Status Belajar "${cellString(data['Status Belajar'])}" tidak valid (harus salah satu dari: ${STATUS_BELAJAR.join(', ')})`,
      });
      continue;
    }

    const payload = {
      jurusanId: jurusan.id,
      tahunAngkatan,
      semester,
      biayaSks: cellNumber(data['Biaya SKS']),
      biayaBpp: cellNumber(data['Biaya BPP']),
      biayaSpp: cellNumber(data['Biaya SPP']),
      statusBelajar,
      isActive: cellString(data['Status Aktif']).toLowerCase() !== 'tidak',
      updatedBy: actorId,
    };

    try {
      const existing = await TarifKuliah.findOne({
        where: { jurusanId: jurusan.id, tahunAngkatan, semester, statusBelajar },
      });
      if (existing) {
        await existing.update(payload);
      } else {
        await TarifKuliah.create({ ...payload, createdBy: actorId });
      }
      successCount += 1;
    } catch (err) {
      errors.push({ row: rowNumber, message: err.message });
    }
  }

  return { successCount, errorCount: errors.length, errors };
};

module.exports = {
  listTarifKuliah,
  getTarifKuliahById,
  createTarifKuliah,
  updateTarifKuliah,
  deleteTarifKuliah,
  exportTarifKuliah,
  exportTarifKuliahTemplate,
  importTarifKuliah,
};
