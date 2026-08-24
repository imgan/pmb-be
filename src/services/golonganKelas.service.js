const { Op } = require('sequelize');
const { GolonganKelas } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = { namaKelas: ['namaKelas'] };

const listGolonganKelas = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where.namaKelas = { [Op.like]: `%${query.search}%` };
  }

  const { rows, count } = await GolonganKelas.findAndCountAll({
    where,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getGolonganKelasById = async (id) => {
  const golonganKelas = await GolonganKelas.findByPk(id);
  if (!golonganKelas) throw new ApiError(404, 'Golongan kelas not found');
  return golonganKelas;
};

const createGolonganKelas = (payload, actorId) =>
  GolonganKelas.create({ ...payload, createdBy: actorId, updatedBy: actorId });

const updateGolonganKelas = async (id, payload, actorId) => {
  const golonganKelas = await getGolonganKelasById(id);
  await golonganKelas.update({ ...payload, updatedBy: actorId });
  return golonganKelas;
};

const deleteGolonganKelas = async (id, actorId) => {
  const golonganKelas = await getGolonganKelasById(id);
  await golonganKelas.update({ isDelete: true, updatedBy: actorId });
};

module.exports = {
  listGolonganKelas,
  getGolonganKelasById,
  createGolonganKelas,
  updateGolonganKelas,
  deleteGolonganKelas,
};
