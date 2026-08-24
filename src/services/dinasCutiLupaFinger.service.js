const { Op } = require('sequelize');
const { DinasCutiLupaFinger, Karyawan } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = {
  tanggalKehadiran: ['tanggalKehadiran'],
  status: ['status'],
};

const KARYAWAN_ATTRS = ['id', 'nip', 'namaLengkap', 'bagian', 'jabatan'];

const listDinasCuti = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  const karyawanWhere = {};
  let karyawanRequired = false;

  if (query.search) {
    karyawanWhere[Op.or] = [
      { nip: { [Op.like]: `%${query.search}%` } },
      { namaLengkap: { [Op.like]: `%${query.search}%` } },
    ];
    karyawanRequired = true;
  }
  if (query.status) where.status = query.status;

  const { rows, count } = await DinasCutiLupaFinger.findAndCountAll({
    where,
    include: [
      {
        model: Karyawan,
        as: 'karyawan',
        attributes: KARYAWAN_ATTRS,
        where: karyawanRequired ? karyawanWhere : undefined,
        required: karyawanRequired,
      },
    ],
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['tanggalKehadiran', 'DESC']]),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getDinasCutiById = async (id) => {
  const item = await DinasCutiLupaFinger.findByPk(id, {
    include: [{ model: Karyawan, as: 'karyawan', attributes: KARYAWAN_ATTRS }],
  });
  if (!item) throw new ApiError(404, 'Data tidak ditemukan');
  return item;
};

const ensureKaryawanExists = async (karyawanId) => {
  const karyawan = await Karyawan.findByPk(karyawanId);
  if (!karyawan) throw new ApiError(400, 'Karyawan tidak ditemukan');
};

const createDinasCuti = async (payload, actorId) => {
  await ensureKaryawanExists(payload.karyawanId);
  const created = await DinasCutiLupaFinger.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  return getDinasCutiById(created.id);
};

const updateDinasCuti = async (id, payload, actorId) => {
  const item = await DinasCutiLupaFinger.findByPk(id);
  if (!item) throw new ApiError(404, 'Data tidak ditemukan');
  if (payload.karyawanId) await ensureKaryawanExists(payload.karyawanId);
  await item.update({ ...payload, updatedBy: actorId });
  return getDinasCutiById(id);
};

const deleteDinasCuti = async (id) => {
  const item = await DinasCutiLupaFinger.findByPk(id);
  if (!item) throw new ApiError(404, 'Data tidak ditemukan');
  await item.destroy();
};

module.exports = {
  listDinasCuti,
  getDinasCutiById,
  createDinasCuti,
  updateDinasCuti,
  deleteDinasCuti,
};
