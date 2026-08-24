const { Op } = require('sequelize');
const { Pembayaran } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = { namaPembayaran: ['namaPembayaran'], isBeasiswa: ['isBeasiswa'] };

const listPembayaran = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where.namaPembayaran = { [Op.like]: `%${query.search}%` };
  }
  if (query.isBeasiswa !== undefined) {
    where.isBeasiswa = query.isBeasiswa === 'true' || query.isBeasiswa === true;
  }

  const { rows, count } = await Pembayaran.findAndCountAll({
    where,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getPembayaranById = async (id) => {
  const pembayaran = await Pembayaran.findByPk(id);
  if (!pembayaran) throw new ApiError(404, 'Pembayaran not found');
  return pembayaran;
};

const createPembayaran = (payload, actorId) => Pembayaran.create({ ...payload, createdBy: actorId, updatedBy: actorId });

const updatePembayaran = async (id, payload, actorId) => {
  const pembayaran = await getPembayaranById(id);
  await pembayaran.update({ ...payload, updatedBy: actorId });
  return pembayaran;
};

const deletePembayaran = async (id) => {
  const pembayaran = await getPembayaranById(id);
  await pembayaran.destroy();
};

module.exports = { listPembayaran, getPembayaranById, createPembayaran, updatePembayaran, deletePembayaran };
