const { Op } = require('sequelize');
const { Beasiswa } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = {
  namaBeasiswa: ['namaBeasiswa'],
  slug: ['slug'],
  status: ['isActive'],
  orderNumber: ['orderNumber'],
};

const listBeasiswa = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where.namaBeasiswa = { [Op.like]: `%${query.search}%` };
  }

  const { rows, count } = await Beasiswa.findAndCountAll({
    where,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['orderNumber', 'ASC'], ['id', 'ASC']]),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getBeasiswaById = async (id) => {
  const beasiswa = await Beasiswa.findByPk(id);
  if (!beasiswa) throw new ApiError(404, 'Beasiswa not found');
  return beasiswa;
};

const ensureUniqueSlug = async (slug, excludeId) => {
  const where = { slug };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  const existing = await Beasiswa.findOne({ where });
  if (existing) throw new ApiError(409, 'Slug already in use');
};

const createBeasiswa = async (payload, actorId) => {
  await ensureUniqueSlug(payload.slug);
  return Beasiswa.create({ ...payload, createdBy: actorId, updatedBy: actorId });
};

const updateBeasiswa = async (id, payload, actorId) => {
  const beasiswa = await getBeasiswaById(id);
  if (payload.slug) {
    await ensureUniqueSlug(payload.slug, id);
  }
  await beasiswa.update({ ...payload, updatedBy: actorId });
  return beasiswa;
};

const deleteBeasiswa = async (id) => {
  const beasiswa = await getBeasiswaById(id);
  await beasiswa.destroy();
};

const listPublicBeasiswa = async () =>
  Beasiswa.findAll({
    where: { isActive: true },
    attributes: ['id', 'namaBeasiswa', 'slug', 'ringkasan', 'orderNumber'],
    order: [['orderNumber', 'ASC'], ['id', 'ASC']],
  });

const getPublicBeasiswaBySlug = async (slug) => {
  const beasiswa = await Beasiswa.findOne({ where: { slug, isActive: true } });
  if (!beasiswa) throw new ApiError(404, 'Beasiswa not found');
  return beasiswa;
};

module.exports = {
  listBeasiswa,
  getBeasiswaById,
  createBeasiswa,
  updateBeasiswa,
  deleteBeasiswa,
  listPublicBeasiswa,
  getPublicBeasiswaBySlug,
};
