const { Op } = require('sequelize');
const { Gelombang, TahunPmb } = require('../models');
const tahunModulService = require('./tahunModul.service');

const INCLUDE_TAHUN = [{ model: TahunPmb.unscoped(), as: 'tahunPmb', attributes: ['id', 'nama', 'jenisSemester', 'isActive'], required: false }];
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = {
  namaGelombang: ['namaGelombang'],
  startDate: ['startDate'],
  endDate: ['endDate'],
};

const listGelombang = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where.namaGelombang = { [Op.like]: `%${query.search}%` };
  }
  // Tahun Ajaran PMB gelombang (Modul Admin › Tahun (PMB)).
  if (query.tahunPmbId) where.tahunPmbId = Number(query.tahunPmbId);

  const { rows, count } = await Gelombang.findAndCountAll({
    where,
    include: INCLUDE_TAHUN,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['startDate', 'DESC']]),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getGelombangById = async (id) => {
  const gelombang = await Gelombang.findByPk(id, { include: INCLUDE_TAHUN });
  if (!gelombang) throw new ApiError(404, 'Gelombang not found');
  return gelombang;
};

/**
 * Gelombang untuk formulir pendaftaran: diutamakan gelombang Tahun PMB aktif (gelombang tanpa tahun tetap ikut,
 * agar data lama berjalan); tidak ada → semua gelombang seperti sebelumnya.
 */
const getActiveGelombang = async () => {
  const tahunPmb = await tahunModulService.aktif('pmb');
  if (tahunPmb) {
    const hasil = await cariGelombangAktif({ [Op.or]: [{ tahunPmbId: tahunPmb.id }, { tahunPmbId: null }] });
    if (hasil) return hasil;
  }
  return cariGelombangAktif({});
};

/**
 * Status diatur admin: AKTIF = dipaksa aktif (didahulukan), TIDAK_AKTIF = tidak pernah dipilih, OTOMATIS = aktif bila
 * hari ini di antara tanggal mulai–selesai (lalu gelombang mendatang terdekat, lalu yang terakhir berakhir).
 */
const cariGelombangAktif = async (lingkup) => {
  const today = new Date().toISOString().slice(0, 10);

  const dipaksa = await Gelombang.findOne({ where: { ...lingkup, status: 'AKTIF' }, order: [['startDate', 'DESC']] });
  if (dipaksa) return dipaksa;

  const otomatis = { ...lingkup, status: 'OTOMATIS' };
  const ongoing = await Gelombang.findOne({
    where: { ...otomatis, startDate: { [Op.lte]: today }, endDate: { [Op.gte]: today } },
    order: [['startDate', 'DESC']],
  });
  if (ongoing) return ongoing;

  const upcoming = await Gelombang.findOne({
    where: { ...otomatis, startDate: { [Op.gt]: today } },
    order: [['startDate', 'ASC']],
  });
  if (upcoming) return upcoming;

  return Gelombang.findOne({ where: otomatis, order: [['endDate', 'DESC']] });
};

const createGelombang = (payload, actorId) =>
  Gelombang.create({ ...payload, createdBy: actorId, updatedBy: actorId });

const updateGelombang = async (id, payload, actorId) => {
  const gelombang = await getGelombangById(id);

  const nextStartDate = payload.startDate ? new Date(payload.startDate) : gelombang.startDate;
  const nextEndDate = payload.endDate ? new Date(payload.endDate) : gelombang.endDate;
  if (nextEndDate < nextStartDate) {
    throw new ApiError(400, 'endDate must be greater than or equal to startDate');
  }

  await gelombang.update({ ...payload, updatedBy: actorId });
  return gelombang;
};

const deleteGelombang = async (id) => {
  const gelombang = await getGelombangById(id);
  await gelombang.destroy();
};

module.exports = {
  listGelombang,
  getGelombangById,
  getActiveGelombang,
  createGelombang,
  updateGelombang,
  deleteGelombang,
};
