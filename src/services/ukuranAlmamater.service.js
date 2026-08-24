const { Op } = require('sequelize');
const { UkuranAlmamater } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = { ukuran: ['ukuran'] };

const listUkuranAlmamater = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where.ukuran = { [Op.like]: `%${query.search}%` };
  }

  const { rows, count } = await UkuranAlmamater.findAndCountAll({
    where,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getUkuranAlmamaterById = async (id) => {
  const ukuranAlmamater = await UkuranAlmamater.findByPk(id);
  if (!ukuranAlmamater) throw new ApiError(404, 'Ukuran almamater not found');
  return ukuranAlmamater;
};

const createUkuranAlmamater = (payload, actorId) =>
  UkuranAlmamater.create({ ...payload, createdBy: actorId, updatedBy: actorId });

const updateUkuranAlmamater = async (id, payload, actorId) => {
  const ukuranAlmamater = await getUkuranAlmamaterById(id);
  await ukuranAlmamater.update({ ...payload, updatedBy: actorId });
  return ukuranAlmamater;
};

const deleteUkuranAlmamater = async (id) => {
  const ukuranAlmamater = await getUkuranAlmamaterById(id);
  await ukuranAlmamater.destroy();
};

module.exports = {
  listUkuranAlmamater,
  getUkuranAlmamaterById,
  createUkuranAlmamater,
  updateUkuranAlmamater,
  deleteUkuranAlmamater,
};
