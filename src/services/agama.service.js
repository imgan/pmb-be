const { Op } = require('sequelize');
const { Agama } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = { kodeAgama: ['kodeAgama'], namaAgama: ['namaAgama'] };

const listAgama = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    const like = { [Op.like]: `%${query.search}%` };
    where[Op.or] = [{ kodeAgama: like }, { namaAgama: like }];
  }

  const { rows, count } = await Agama.findAndCountAll({
    where,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['kodeAgama', 'ASC']]),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getAgamaById = async (id) => {
  const agama = await Agama.findByPk(id);
  if (!agama) throw new ApiError(404, 'Agama not found');
  return agama;
};

/** Kode & nama agama unik di antara data yang belum dihapus. */
const ensureUnik = async ({ kodeAgama, namaAgama }, exceptId) => {
  const notSelf = exceptId ? { id: { [Op.ne]: exceptId } } : {};
  if (kodeAgama && (await Agama.findOne({ where: { kodeAgama, ...notSelf } }))) {
    throw new ApiError(409, `Kode agama ${kodeAgama} sudah dipakai`);
  }
  if (namaAgama && (await Agama.findOne({ where: { namaAgama, ...notSelf } }))) {
    throw new ApiError(409, `Agama ${namaAgama} sudah ada`);
  }
};

const createAgama = async (payload, actorId) => {
  await ensureUnik(payload);
  return Agama.create({ ...payload, createdBy: actorId, updatedBy: actorId });
};

const updateAgama = async (id, payload, actorId) => {
  const agama = await getAgamaById(id);
  await ensureUnik(payload, agama.id);
  await agama.update({ ...payload, updatedBy: actorId });
  return agama;
};

const deleteAgama = async (id, actorId) => {
  const agama = await getAgamaById(id);
  await agama.update({ isDelete: true, updatedBy: actorId });
};

module.exports = { listAgama, getAgamaById, createAgama, updateAgama, deleteAgama };
