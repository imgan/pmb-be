const { Op } = require('sequelize');
const { PembimbingMagang, Dosen } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = {
  noSk: ['noSk'],
  tanggalSk: ['tanggalSk'],
};

const listPembimbingMagang = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  const dosenWhere = {};
  let dosenRequired = false;

  if (query.search) {
    dosenWhere[Op.or] = [{ namaLengkap: { [Op.like]: `%${query.search}%` } }, { nidn: { [Op.like]: `%${query.search}%` } }];
    dosenRequired = true;
  }

  const { rows, count } = await PembimbingMagang.findAndCountAll({
    where,
    include: [
      {
        model: Dosen,
        as: 'dosen',
        attributes: ['id', 'namaLengkap', 'nidn'],
        where: dosenRequired ? dosenWhere : undefined,
        required: dosenRequired,
      },
    ],
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['createdAt', 'DESC']]),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getPembimbingMagangById = async (id) => {
  const item = await PembimbingMagang.findByPk(id, {
    include: [{ model: Dosen, as: 'dosen', attributes: ['id', 'namaLengkap', 'nidn'], required: false }],
  });
  if (!item) throw new ApiError(404, 'Data tidak ditemukan');
  return item;
};

const createPembimbingMagang = async (payload, actorId) => {
  const created = await PembimbingMagang.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  return getPembimbingMagangById(created.id);
};

const updatePembimbingMagang = async (id, payload, actorId) => {
  const item = await PembimbingMagang.findByPk(id);
  if (!item) throw new ApiError(404, 'Data tidak ditemukan');
  await item.update({ ...payload, updatedBy: actorId });
  return getPembimbingMagangById(id);
};

const deletePembimbingMagang = async (id) => {
  const item = await PembimbingMagang.findByPk(id);
  if (!item) throw new ApiError(404, 'Data tidak ditemukan');
  await item.update({ isDelete: true });
};

module.exports = {
  listPembimbingMagang,
  getPembimbingMagangById,
  createPembimbingMagang,
  updatePembimbingMagang,
  deletePembimbingMagang,
};
