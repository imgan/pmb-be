const { Op } = require('sequelize');
const { Jurusan, GolonganKelas } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = {
  namaJurusan: ['namaJurusan'],
  golonganKelas: [{ model: GolonganKelas, as: 'golonganKelas' }, 'namaKelas'],
};

const ensureGolonganKelasExists = async (golonganKelasId) => {
  const golonganKelas = await GolonganKelas.findByPk(golonganKelasId);
  if (!golonganKelas) throw new ApiError(400, 'Golongan kelas not found');
};

const listJurusan = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where.namaJurusan = { [Op.like]: `%${query.search}%` };
  }
  if (query.golonganKelasId) {
    where.golonganKelasId = query.golonganKelasId;
  }

  const { rows, count } = await Jurusan.findAndCountAll({
    where,
    include: [{ model: GolonganKelas, as: 'golonganKelas' }],
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS),
    subQuery: false,
    distinct: true,
  });

  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getJurusanById = async (id) => {
  const jurusan = await Jurusan.findByPk(id, { include: [{ model: GolonganKelas, as: 'golonganKelas' }] });
  if (!jurusan) throw new ApiError(404, 'Jurusan not found');
  return jurusan;
};

const createJurusan = async (payload, actorId) => {
  await ensureGolonganKelasExists(payload.golonganKelasId);
  const jurusan = await Jurusan.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  return getJurusanById(jurusan.id);
};

const updateJurusan = async (id, payload, actorId) => {
  const jurusan = await Jurusan.findByPk(id);
  if (!jurusan) throw new ApiError(404, 'Jurusan not found');

  if (payload.golonganKelasId) {
    await ensureGolonganKelasExists(payload.golonganKelasId);
  }

  await jurusan.update({ ...payload, updatedBy: actorId });
  return getJurusanById(id);
};

const deleteJurusan = async (id, actorId) => {
  const jurusan = await Jurusan.findByPk(id);
  if (!jurusan) throw new ApiError(404, 'Jurusan not found');
  await jurusan.update({ isDelete: true, updatedBy: actorId });
};

module.exports = { listJurusan, getJurusanById, createJurusan, updateJurusan, deleteJurusan };
