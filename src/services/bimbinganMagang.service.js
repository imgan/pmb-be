const { Op } = require('sequelize');
const { BimbinganMagang, Mahasiswa, PembimbingMagang, Dosen } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = {
  nilai: ['nilai'],
  kelas: ['kelas'],
};

const INCLUDE = [
  { model: Mahasiswa, as: 'mahasiswa', attributes: ['id', 'nim', 'namaLengkap'], required: false },
  {
    model: PembimbingMagang,
    as: 'pembimbingMagang',
    attributes: ['id'],
    required: false,
    include: [{ model: Dosen, as: 'dosen', attributes: ['id', 'namaLengkap', 'nidn'], required: false }],
  },
];

const listBimbinganMagang = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  const mahasiswaWhere = {};
  let mahasiswaRequired = false;

  if (query.search) {
    mahasiswaWhere[Op.or] = [
      { nim: { [Op.like]: `%${query.search}%` } },
      { namaLengkap: { [Op.like]: `%${query.search}%` } },
    ];
    mahasiswaRequired = true;
  }

  const { rows, count } = await BimbinganMagang.findAndCountAll({
    where,
    include: [
      { ...INCLUDE[0], where: mahasiswaRequired ? mahasiswaWhere : undefined, required: mahasiswaRequired },
      INCLUDE[1],
    ],
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['createdAt', 'DESC']]),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getBimbinganMagangById = async (id) => {
  const item = await BimbinganMagang.findByPk(id, { include: INCLUDE });
  if (!item) throw new ApiError(404, 'Data tidak ditemukan');
  return item;
};

const createBimbinganMagang = async (payload, actorId) => {
  const created = await BimbinganMagang.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  return getBimbinganMagangById(created.id);
};

const updateBimbinganMagang = async (id, payload, actorId) => {
  const item = await BimbinganMagang.findByPk(id);
  if (!item) throw new ApiError(404, 'Data tidak ditemukan');
  await item.update({ ...payload, updatedBy: actorId });
  return getBimbinganMagangById(id);
};

const deleteBimbinganMagang = async (id) => {
  const item = await BimbinganMagang.findByPk(id);
  if (!item) throw new ApiError(404, 'Data tidak ditemukan');
  await item.update({ isDelete: true });
};

module.exports = {
  listBimbinganMagang,
  getBimbinganMagangById,
  createBimbinganMagang,
  updateBimbinganMagang,
  deleteBimbinganMagang,
};
