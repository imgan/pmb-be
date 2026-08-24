const { Op } = require('sequelize');
const { DokumenPendaftaran } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = { namaPendaftaran: ['namaPendaftaran'], isWajib: ['isWajib'] };

const listDokumenPendaftaran = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where.namaPendaftaran = { [Op.like]: `%${query.search}%` };
  }
  if (query.isWajib !== undefined) {
    where.isWajib = query.isWajib === 'true' || query.isWajib === true;
  }

  const { rows, count } = await DokumenPendaftaran.findAndCountAll({
    where,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getDokumenPendaftaranById = async (id) => {
  const dokumenPendaftaran = await DokumenPendaftaran.findByPk(id);
  if (!dokumenPendaftaran) throw new ApiError(404, 'Dokumen pendaftaran not found');
  return dokumenPendaftaran;
};

const createDokumenPendaftaran = (payload, actorId) =>
  DokumenPendaftaran.create({ ...payload, createdBy: actorId, updatedBy: actorId });

const updateDokumenPendaftaran = async (id, payload, actorId) => {
  const dokumenPendaftaran = await getDokumenPendaftaranById(id);
  await dokumenPendaftaran.update({ ...payload, updatedBy: actorId });
  return dokumenPendaftaran;
};

const deleteDokumenPendaftaran = async (id) => {
  const dokumenPendaftaran = await getDokumenPendaftaranById(id);
  await dokumenPendaftaran.destroy();
};

module.exports = {
  listDokumenPendaftaran,
  getDokumenPendaftaranById,
  createDokumenPendaftaran,
  updateDokumenPendaftaran,
  deleteDokumenPendaftaran,
};
