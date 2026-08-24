const { Op } = require('sequelize');
const { JadwalSidang, TahunAjaran, Jurusan, Dosen } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = {
  tanggal: ['tanggal'],
  jam: ['jam'],
};

const INCLUDE = [
  { model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'nama'], required: false },
  { model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan', 'kodeProdi'], required: false },
  { model: Dosen, as: 'dosenPenguji', attributes: ['id', 'namaLengkap', 'nidn'], required: false },
];

const listJadwalSidang = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.tahunAjaranId) where.tahunAjaranId = query.tahunAjaranId;
  if (query.semester) where.semester = query.semester;
  if (query.search) {
    where[Op.or] = [{ ruangan: { [Op.like]: `%${query.search}%` } }, { noSk: { [Op.like]: `%${query.search}%` } }];
  }

  const { rows, count } = await JadwalSidang.findAndCountAll({
    where,
    include: INCLUDE,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['tanggal', 'DESC']]),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getJadwalSidangById = async (id) => {
  const item = await JadwalSidang.findByPk(id, { include: INCLUDE });
  if (!item) throw new ApiError(404, 'Data tidak ditemukan');
  return item;
};

const createJadwalSidang = async (payload, actorId) => {
  const created = await JadwalSidang.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  return getJadwalSidangById(created.id);
};

const updateJadwalSidang = async (id, payload, actorId) => {
  const item = await JadwalSidang.findByPk(id);
  if (!item) throw new ApiError(404, 'Data tidak ditemukan');
  await item.update({ ...payload, updatedBy: actorId });
  return getJadwalSidangById(id);
};

const deleteJadwalSidang = async (id) => {
  const item = await JadwalSidang.findByPk(id);
  if (!item) throw new ApiError(404, 'Data tidak ditemukan');
  await item.update({ isDelete: true });
};

module.exports = {
  listJadwalSidang,
  getJadwalSidangById,
  createJadwalSidang,
  updateJadwalSidang,
  deleteJadwalSidang,
};
