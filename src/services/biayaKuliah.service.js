const { Op } = require('sequelize');
const { BiayaKuliah } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = {
  judul: ['judul'],
  slug: ['slug'],
  status: ['isActive'],
  orderNumber: ['orderNumber'],
};

const listBiayaKuliah = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where.judul = { [Op.like]: `%${query.search}%` };
  }

  const { rows, count } = await BiayaKuliah.findAndCountAll({
    where,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['orderNumber', 'ASC'], ['id', 'ASC']]),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getBiayaKuliahById = async (id) => {
  const biayaKuliah = await BiayaKuliah.findByPk(id);
  if (!biayaKuliah) throw new ApiError(404, 'Biaya kuliah not found');
  return biayaKuliah;
};

const ensureUniqueSlug = async (slug, excludeId) => {
  const where = { slug };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  const existing = await BiayaKuliah.findOne({ where });
  if (existing) throw new ApiError(409, 'Slug already in use');
};

const createBiayaKuliah = async (payload, actorId) => {
  await ensureUniqueSlug(payload.slug);
  return BiayaKuliah.create({ ...payload, createdBy: actorId, updatedBy: actorId });
};

const updateBiayaKuliah = async (id, payload, actorId) => {
  const biayaKuliah = await getBiayaKuliahById(id);
  if (payload.slug) {
    await ensureUniqueSlug(payload.slug, id);
  }
  await biayaKuliah.update({ ...payload, updatedBy: actorId });
  return biayaKuliah;
};

const deleteBiayaKuliah = async (id) => {
  const biayaKuliah = await getBiayaKuliahById(id);
  await biayaKuliah.destroy();
};

const listPublicBiayaKuliah = async () =>
  BiayaKuliah.findAll({
    where: { isActive: true },
    attributes: ['id', 'judul', 'slug', 'ringkasan', 'orderNumber'],
    order: [['orderNumber', 'ASC'], ['id', 'ASC']],
  });

const getPublicBiayaKuliahBySlug = async (slug) => {
  const biayaKuliah = await BiayaKuliah.findOne({ where: { slug, isActive: true } });
  if (!biayaKuliah) throw new ApiError(404, 'Biaya kuliah not found');
  return biayaKuliah;
};

module.exports = {
  listBiayaKuliah,
  getBiayaKuliahById,
  createBiayaKuliah,
  updateBiayaKuliah,
  deleteBiayaKuliah,
  listPublicBiayaKuliah,
  getPublicBiayaKuliahBySlug,
};
