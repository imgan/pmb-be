const { Op } = require('sequelize');
const { MataKuliah } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = {
  kodeMk: ['kodeMk'],
  namaMk: ['namaMk'],
  sks: ['sks'],
};

const listMataKuliah = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where[Op.or] = [
      { kodeMk: { [Op.like]: `%${query.search}%` } },
      { namaMk: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await MataKuliah.findAndCountAll({
    where,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['namaMk', 'ASC']]),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getMataKuliahById = async (id) => {
  const mk = await MataKuliah.findByPk(id);
  if (!mk) throw new ApiError(404, 'Mata kuliah not found');
  return mk;
};

const ensureUniqueKode = async (kodeMk, excludeId) => {
  const existing = await MataKuliah.findOne({
    where: { kodeMk, ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}) },
  });
  if (existing) throw new ApiError(400, 'Kode mata kuliah sudah digunakan');
};

const createMataKuliah = async (payload, actorId) => {
  await ensureUniqueKode(payload.kodeMk);
  const mk = await MataKuliah.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  return getMataKuliahById(mk.id);
};

const updateMataKuliah = async (id, payload, actorId) => {
  const mk = await getMataKuliahById(id);
  if (payload.kodeMk) await ensureUniqueKode(payload.kodeMk, id);
  await mk.update({ ...payload, updatedBy: actorId });
  return getMataKuliahById(id);
};

const deleteMataKuliah = async (id, actorId) => {
  const mk = await getMataKuliahById(id);
  await mk.update({ isDelete: true, updatedBy: actorId });
};

module.exports = { listMataKuliah, getMataKuliahById, createMataKuliah, updateMataKuliah, deleteMataKuliah };
