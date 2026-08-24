const { Op, fn, col } = require('sequelize');
const { KehadiranDosen, JadwalKuliah, Dosen } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const includeRelations = [
  { model: JadwalKuliah, as: 'jadwalKuliah' },
  { model: Dosen, as: 'dosen' },
];

const SORTABLE_COLUMNS = {
  tanggalRealisasi: ['tanggalRealisasi'],
  status: ['status'],
  dosen: [{ model: Dosen, as: 'dosen' }, 'namaLengkap'],
  mataKuliah: [{ model: JadwalKuliah, as: 'jadwalKuliah' }, 'namaMataKuliah'],
};

const listKehadiranDosen = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.status) {
    where.status = query.status;
  }

  const jadwalWhere = {};
  if (query.kelas) {
    jadwalWhere.kelas = query.kelas;
  }

  const include = [
    { model: JadwalKuliah, as: 'jadwalKuliah', where: Object.keys(jadwalWhere).length ? jadwalWhere : undefined },
    { model: Dosen, as: 'dosen' },
  ];

  if (query.search) {
    where[Op.or] = [
      { '$dosen.nama_lengkap$': { [Op.like]: `%${query.search}%` } },
      { '$jadwalKuliah.nama_mata_kuliah$': { [Op.like]: `%${query.search}%` } },
      { '$jadwalKuliah.kelas$': { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await KehadiranDosen.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['tanggalRealisasi', 'DESC']]),
    subQuery: false,
    distinct: true,
  });

  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getStatusSummary = async () => {
  const rows = await KehadiranDosen.findAll({
    attributes: ['status', [fn('COUNT', col('id')), 'total']],
    group: ['status'],
    raw: true,
  });
  return rows.map((row) => ({ status: row.status, total: Number(row.total) }));
};

const getKehadiranDosenById = async (id) => {
  const item = await KehadiranDosen.findByPk(id, { include: includeRelations });
  if (!item) throw new ApiError(404, 'Kehadiran dosen not found');
  return item;
};

const createKehadiranDosen = async (payload, actorId) => {
  const item = await KehadiranDosen.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  return getKehadiranDosenById(item.id);
};

const updateKehadiranDosen = async (id, payload, actorId) => {
  const item = await getKehadiranDosenById(id);
  await item.update({ ...payload, updatedBy: actorId });
  return getKehadiranDosenById(id);
};

const deleteKehadiranDosen = async (id, actorId) => {
  const item = await getKehadiranDosenById(id);
  await item.update({ isDelete: true, updatedBy: actorId });
};

module.exports = {
  listKehadiranDosen,
  getStatusSummary,
  getKehadiranDosenById,
  createKehadiranDosen,
  updateKehadiranDosen,
  deleteKehadiranDosen,
};
