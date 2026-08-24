const { Op } = require('sequelize');
const { DokumenKelengkapan } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = {
  namaKelengkapan: ['namaKelengkapan'],
  isWajib: ['isWajib'],
  isBeasiswa: ['isBeasiswa'],
};

const listDokumenKelengkapan = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where.namaKelengkapan = { [Op.like]: `%${query.search}%` };
  }
  if (query.isWajib !== undefined) {
    where.isWajib = query.isWajib === 'true' || query.isWajib === true;
  }
  if (query.isBeasiswa !== undefined) {
    where.isBeasiswa = query.isBeasiswa === 'true' || query.isBeasiswa === true;
  }

  // list tidak menyertakan kolom `file` (base64) agar payload tidak membengkak
  const { rows, count } = await DokumenKelengkapan.findAndCountAll({
    where,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getDokumenKelengkapanById = async (id) => {
  const dokumenKelengkapan = await DokumenKelengkapan.scope('withFile').findByPk(id);
  if (!dokumenKelengkapan) throw new ApiError(404, 'Dokumen kelengkapan not found');
  return dokumenKelengkapan;
};

const createDokumenKelengkapan = (payload, actorId) =>
  DokumenKelengkapan.create({ ...payload, createdBy: actorId, updatedBy: actorId });

const updateDokumenKelengkapan = async (id, payload, actorId) => {
  const dokumenKelengkapan = await getDokumenKelengkapanById(id);
  await dokumenKelengkapan.update({ ...payload, updatedBy: actorId });
  return dokumenKelengkapan;
};

const deleteDokumenKelengkapan = async (id) => {
  const dokumenKelengkapan = await getDokumenKelengkapanById(id);
  await dokumenKelengkapan.destroy();
};

module.exports = {
  listDokumenKelengkapan,
  getDokumenKelengkapanById,
  createDokumenKelengkapan,
  updateDokumenKelengkapan,
  deleteDokumenKelengkapan,
};
