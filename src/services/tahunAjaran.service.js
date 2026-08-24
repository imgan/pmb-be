const { Op } = require('sequelize');
const { TahunAjaran } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = {
  nama: ['nama'],
  tahunMulai: ['tahunMulai'],
  tahunSelesai: ['tahunSelesai'],
  isActive: ['isActive'],
};

const listTahunAjaran = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where.nama = { [Op.like]: `%${query.search}%` };
  }
  if (query.isActive !== undefined) {
    where.isActive = query.isActive === 'true' || query.isActive === true;
  }

  const { rows, count } = await TahunAjaran.findAndCountAll({
    where,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['tahunMulai', 'DESC']]),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getTahunAjaranById = async (id) => {
  const tahunAjaran = await TahunAjaran.findByPk(id);
  if (!tahunAjaran) throw new ApiError(404, 'Tahun ajaran not found');
  return tahunAjaran;
};

const ensureUniqueNama = async (nama, excludeId) => {
  const where = { nama };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  const existing = await TahunAjaran.findOne({ where });
  if (existing) throw new ApiError(409, 'Nama tahun ajaran sudah digunakan');
};

const createTahunAjaran = async (payload, actorId) => {
  await ensureUniqueNama(payload.nama);
  return TahunAjaran.create({ ...payload, createdBy: actorId, updatedBy: actorId });
};

const updateTahunAjaran = async (id, payload, actorId) => {
  const tahunAjaran = await getTahunAjaranById(id);
  if (payload.nama) {
    await ensureUniqueNama(payload.nama, id);
  }
  await tahunAjaran.update({ ...payload, updatedBy: actorId });
  return tahunAjaran;
};

const deleteTahunAjaran = async (id, actorId) => {
  const tahunAjaran = await getTahunAjaranById(id);
  await tahunAjaran.update({ isDelete: true, updatedBy: actorId });
};

module.exports = {
  listTahunAjaran,
  getTahunAjaranById,
  createTahunAjaran,
  updateTahunAjaran,
  deleteTahunAjaran,
};
