const { Op } = require('sequelize');
const { sequelize, TahunPmb, TahunKeuangan, TahunAjaran } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

/**
 * Tahun Ajaran PMB & Tahun Ajaran Keuangan (Modul Admin › Master): data periode tersendiri per modul, terpisah dari
 * tahun akademik — PMB dapat membuka penerimaan tahun depan dan kasir masih menagih semester lalu tanpa mengubah
 * tahun akademik / semester mahasiswa. Satu baris aktif per modul.
 */
const MODEL = { pmb: TahunPmb, keuangan: TahunKeuangan };
const LABEL = { pmb: 'Tahun ajaran PMB', keuangan: 'Tahun ajaran keuangan' };
const SORTABLE_COLUMNS = { nama: ['nama'], tahunMulai: ['tahunMulai'], tahunSelesai: ['tahunSelesai'], isActive: ['isActive'] };

const modelOf = (modul) => {
  const model = MODEL[modul];
  if (!model) throw new ApiError(400, 'Modul tidak dikenal');
  return model;
};

const list = async (modul, query) => {
  const Model = modelOf(modul);
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) where.nama = { [Op.like]: `%${query.search}%` };
  if (query.isActive !== undefined && query.isActive !== '') where.isActive = query.isActive === 'true' || query.isActive === true;
  const { rows, count } = await Model.findAndCountAll({
    where,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [
      ['tahunMulai', 'DESC'],
      ['jenisSemester', 'DESC'],
    ]),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getById = async (modul, id) => {
  const row = await modelOf(modul).findByPk(id);
  if (!row) throw new ApiError(404, `${LABEL[modul]} tidak ditemukan`);
  return row;
};

/** Unik per nama + semester (Ganjil & Genap memakai nama yang sama). */
const ensureUnik = async (modul, nama, jenisSemester = 'GANJIL', excludeId) => {
  const where = { nama, jenisSemester };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  if (await modelOf(modul).findOne({ where })) throw new ApiError(409, `${LABEL[modul]} ${nama} ${jenisSemester} sudah ada`);
};

/** Menjadikan satu baris aktif dan menonaktifkan yang lain (dalam transaksi). */
const jadikanSatuAktif = async (modul, row, actorId, transaction) => {
  await modelOf(modul).update({ isActive: false, updatedBy: actorId }, { where: { isActive: true, id: { [Op.ne]: row.id } }, transaction });
  await row.update({ isActive: true, updatedBy: actorId }, { transaction });
};

const create = async (modul, payload, actorId) => {
  await ensureUnik(modul, payload.nama, payload.jenisSemester);
  return sequelize.transaction(async (transaction) => {
    const row = await modelOf(modul).create({ ...payload, isActive: false, createdBy: actorId, updatedBy: actorId }, { transaction });
    if (payload.isActive) await jadikanSatuAktif(modul, row, actorId, transaction);
    return row;
  });
};

const update = async (modul, id, payload, actorId) => {
  const row = await getById(modul, id);
  if (payload.nama || payload.jenisSemester) await ensureUnik(modul, payload.nama ?? row.nama, payload.jenisSemester ?? row.jenisSemester, row.id);
  const { isActive, ...lain } = payload;
  return sequelize.transaction(async (transaction) => {
    await row.update({ ...lain, updatedBy: actorId }, { transaction });
    if (isActive && !row.isActive) await jadikanSatuAktif(modul, row, actorId, transaction);
    else if (isActive === false && row.isActive) await row.update({ isActive: false }, { transaction });
    return row;
  });
};

const remove = async (modul, id, actorId) => {
  const row = await getById(modul, id);
  if (row.isActive) throw new ApiError(400, `${LABEL[modul]} yang sedang aktif tidak dapat dihapus. Aktifkan tahun lain terlebih dahulu.`);
  if (modul === 'pmb') {
    const [{ n }] = await sequelize.query('SELECT COUNT(*) AS n FROM gelombang WHERE tahun_pmb_id = :id', { replacements: { id: row.id }, type: sequelize.QueryTypes.SELECT });
    if (Number(n)) throw new ApiError(400, `Tahun ini dipakai ${n} gelombang; ubah tahun gelombang tersebut terlebih dahulu.`);
  }
  await row.update({ isDelete: true, isActive: false, updatedBy: actorId });
};

const activate = async (modul, id, actorId) => {
  const row = await getById(modul, id);
  if (row.isActive) throw new ApiError(400, `${LABEL[modul]} ini sudah aktif`);
  await sequelize.transaction((transaction) => jadikanSatuAktif(modul, row, actorId, transaction));
  return row;
};

const aktif = (modul) => modelOf(modul).findOne({ where: { isActive: true }, order: [['id', 'DESC']] });

/**
 * Tahun akademik (tahun_ajaran) yang setara dengan tahun aktif modul (nama + semester sama) — dipakai untuk data yang
 * tersimpan per tahun akademik (tagihan kuliah, pilihan tahun saat login). Belum ada padanan → tahun akademik aktif.
 */
const padananTahunAjaran = async (modul) => {
  const t = await aktif(modul);
  const padanan = t ? await TahunAjaran.findOne({ where: { nama: t.nama, jenisSemester: t.jenisSemester } }) : null;
  return padanan ?? TahunAjaran.findOne({ where: { isActive: true }, order: [['id', 'DESC']] });
};

module.exports = { list, getById, create, update, remove, activate, aktif, padananTahunAjaran };
