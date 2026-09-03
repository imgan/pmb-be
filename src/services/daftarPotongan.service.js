const { Op } = require('sequelize');
const { DaftarPotongan, Mahasiswa } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { buildWorkbook, parseWorkbookFromBase64, cellString } = require('../utils/excel');

const includeRelations = [{ model: Mahasiswa, as: 'mahasiswa', required: false }];

const EXPORT_COLUMNS = [
  { header: 'NIM', key: 'nim', width: 20 },
  { header: 'Nama Mahasiswa', key: 'namaLengkap', width: 30 },
  { header: 'Biaya', key: 'biaya', width: 18 },
  { header: 'Semester', key: 'semester', width: 12 },
  { header: 'Alasan', key: 'alasan', width: 30 },
  { header: 'Asal', key: 'asal', width: 20 },
];

const cellNumber = (value) => {
  const cleaned = cellString(value).replace(/[^0-9-]/g, '');
  if (!cleaned) return 0;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
};

const SORTABLE_COLUMNS = {
  biaya: ['biaya'],
  semester: ['semester'],
};

const listDaftarPotongan = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};

  const include = query.search
    ? [
        {
          ...includeRelations[0],
          required: true,
          where: {
            [Op.or]: [
              { nim: { [Op.like]: `%${query.search}%` } },
              { namaLengkap: { [Op.like]: `%${query.search}%` } },
            ],
          },
        },
      ]
    : includeRelations;

  const { rows, count } = await DaftarPotongan.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['id', 'DESC']]),
    subQuery: false,
    distinct: true,
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getDaftarPotonganById = async (id) => {
  const item = await DaftarPotongan.findByPk(id, { include: includeRelations });
  if (!item) throw new ApiError(404, 'Data potongan tidak ditemukan');
  return item;
};

const resolveMahasiswaId = async (nim) => {
  const mahasiswa = await Mahasiswa.findOne({ where: { nim } });
  if (!mahasiswa) throw new ApiError(404, `Mahasiswa dengan NIM "${nim}" tidak ditemukan`);
  return mahasiswa.id;
};

const createDaftarPotongan = async (payload, actorId) => {
  const { nim, ...rest } = payload;
  const mahasiswaId = await resolveMahasiswaId(nim);
  const item = await DaftarPotongan.create({ ...rest, mahasiswaId, createdBy: actorId, updatedBy: actorId });
  return getDaftarPotonganById(item.id);
};

const deleteDaftarPotongan = async (id) => {
  const item = await getDaftarPotonganById(id);
  await item.destroy();
};

const exportDaftarPotongan = async () => {
  const rows = await DaftarPotongan.findAll({ include: includeRelations, order: [['id', 'DESC']] });
  const data = rows.map((d) => ({
    nim: d.mahasiswa?.nim ?? '',
    namaLengkap: d.mahasiswa?.namaLengkap ?? '',
    biaya: d.biaya,
    semester: d.semester ?? '',
    alasan: d.alasan ?? '',
    asal: d.asal ?? '',
  }));
  return buildWorkbook('Daftar Potongan', EXPORT_COLUMNS, data);
};

const exportDaftarPotonganTemplate = () => {
  const sample = {
    nim: 'TI20260001',
    namaLengkap: 'Contoh Nama Mahasiswa (informasi saja, tidak diproses saat import)',
    biaya: 250000,
    semester: 1,
    alasan: 'Beasiswa LLDIKTI',
    asal: 'LLDIKTI',
  };
  return buildWorkbook('Daftar Potongan', EXPORT_COLUMNS, [sample]);
};

/**
 * Daftar potongan tidak punya operasi update (lihat createDaftarPotongan/deleteDaftarPotongan
 * di atas — ini memang catatan/log potongan per kejadian, bukan master rate). Import karena itu
 * SELALU membuat baris baru, tidak pernah mencocokkan/mengganti baris yang sudah ada.
 */
const importDaftarPotongan = async (fileBase64, actorId) => {
  const rows = await parseWorkbookFromBase64(fileBase64);
  const errors = [];
  let successCount = 0;

  for (const { rowNumber, data } of rows) {
    const nim = cellString(data['NIM']);
    if (!nim) {
      errors.push({ row: rowNumber, message: 'NIM wajib diisi' });
      continue;
    }
    const mahasiswa = await Mahasiswa.findOne({ where: { nim } });
    if (!mahasiswa) {
      errors.push({ row: rowNumber, message: `Mahasiswa dengan NIM ${nim} tidak ditemukan` });
      continue;
    }

    const biaya = cellNumber(data['Biaya']);
    if (!biaya) {
      errors.push({ row: rowNumber, message: 'Biaya wajib diisi dengan angka > 0' });
      continue;
    }

    const semesterStr = cellString(data['Semester']);

    try {
      await DaftarPotongan.create({
        mahasiswaId: mahasiswa.id,
        biaya,
        semester: semesterStr ? cellNumber(semesterStr) : null,
        alasan: cellString(data['Alasan']) || null,
        asal: cellString(data['Asal']) || null,
        createdBy: actorId,
        updatedBy: actorId,
      });
      successCount += 1;
    } catch (err) {
      errors.push({ row: rowNumber, message: err.message });
    }
  }

  return { successCount, errorCount: errors.length, errors };
};

module.exports = {
  listDaftarPotongan,
  getDaftarPotonganById,
  createDaftarPotongan,
  deleteDaftarPotongan,
  exportDaftarPotongan,
  exportDaftarPotonganTemplate,
  importDaftarPotongan,
};
