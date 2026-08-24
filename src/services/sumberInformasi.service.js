const { Op } = require('sequelize');
const { SumberInformasi } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = { namaInformasi: ['namaInformasi'] };

const listSumberInformasi = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where.namaInformasi = { [Op.like]: `%${query.search}%` };
  }

  const { rows, count } = await SumberInformasi.findAndCountAll({
    where,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getSumberInformasiById = async (id) => {
  const sumberInformasi = await SumberInformasi.findByPk(id);
  if (!sumberInformasi) throw new ApiError(404, 'Sumber informasi not found');
  return sumberInformasi;
};

const createSumberInformasi = (payload, actorId) =>
  SumberInformasi.create({ ...payload, createdBy: actorId, updatedBy: actorId });

const updateSumberInformasi = async (id, payload, actorId) => {
  const sumberInformasi = await getSumberInformasiById(id);
  await sumberInformasi.update({ ...payload, updatedBy: actorId });
  return sumberInformasi;
};

const deleteSumberInformasi = async (id) => {
  const sumberInformasi = await getSumberInformasiById(id);
  await sumberInformasi.destroy();
};

module.exports = {
  listSumberInformasi,
  getSumberInformasiById,
  createSumberInformasi,
  updateSumberInformasi,
  deleteSumberInformasi,
};
