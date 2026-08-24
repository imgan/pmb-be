const { Op } = require('sequelize');
const { Gelombang } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = {
  namaGelombang: ['namaGelombang'],
  startDate: ['startDate'],
  endDate: ['endDate'],
};

const listGelombang = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where.namaGelombang = { [Op.like]: `%${query.search}%` };
  }

  const { rows, count } = await Gelombang.findAndCountAll({
    where,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['startDate', 'DESC']]),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getGelombangById = async (id) => {
  const gelombang = await Gelombang.findByPk(id);
  if (!gelombang) throw new ApiError(404, 'Gelombang not found');
  return gelombang;
};

const getActiveGelombang = async () => {
  const today = new Date().toISOString().slice(0, 10);

  const ongoing = await Gelombang.findOne({
    where: { startDate: { [Op.lte]: today }, endDate: { [Op.gte]: today } },
    order: [['startDate', 'DESC']],
  });
  if (ongoing) return ongoing;

  const upcoming = await Gelombang.findOne({
    where: { startDate: { [Op.gt]: today } },
    order: [['startDate', 'ASC']],
  });
  if (upcoming) return upcoming;

  return Gelombang.findOne({ order: [['endDate', 'DESC']] });
};

const createGelombang = (payload, actorId) =>
  Gelombang.create({ ...payload, createdBy: actorId, updatedBy: actorId });

const updateGelombang = async (id, payload, actorId) => {
  const gelombang = await getGelombangById(id);

  const nextStartDate = payload.startDate ? new Date(payload.startDate) : gelombang.startDate;
  const nextEndDate = payload.endDate ? new Date(payload.endDate) : gelombang.endDate;
  if (nextEndDate < nextStartDate) {
    throw new ApiError(400, 'endDate must be greater than or equal to startDate');
  }

  await gelombang.update({ ...payload, updatedBy: actorId });
  return gelombang;
};

const deleteGelombang = async (id) => {
  const gelombang = await getGelombangById(id);
  await gelombang.destroy();
};

module.exports = {
  listGelombang,
  getGelombangById,
  getActiveGelombang,
  createGelombang,
  updateGelombang,
  deleteGelombang,
};
