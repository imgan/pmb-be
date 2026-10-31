const { Op } = require('sequelize');
const { sequelize, Kurikulum, MataKuliah, Jurusan } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

/**
 * Kurikulum (header): satu prodi pada satu tahun kurikulum, berisi banyak mata kuliah
 * (lihat mataKuliah.service). Daftar menyertakan jumlah mata kuliah & total SKS.
 */

const includeJurusan = { model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan', 'kodeProdi'], required: false };

const SORTABLE_COLUMNS = {
  nama: ['nama'],
  tahunKurikulum: ['tahunKurikulum'],
  tanggalMulaiEfektif: ['tanggalMulaiEfektif'],
};

/** Jumlah MK (total, OBE, Non OBE) & total SKS per kurikulum. */
const ringkasanMataKuliah = async (kurikulumIds) => {
  if (!kurikulumIds.length) return new Map();
  const rows = await sequelize.query(
    `SELECT kurikulum_id AS kurikulumId, COUNT(*) AS jumlahMataKuliah, SUM(is_obe = 1) AS jumlahObe,
            SUM(sks_teori + sks_praktek + sks_lab + sks_simulasi) AS totalSks
       FROM mata_kuliah WHERE is_delete = 0 AND kurikulum_id IN (:ids) GROUP BY kurikulum_id`,
    { replacements: { ids: kurikulumIds }, type: sequelize.QueryTypes.SELECT }
  );
  return new Map(
    rows.map((r) => {
      const jumlahMataKuliah = Number(r.jumlahMataKuliah);
      const jumlahObe = Number(r.jumlahObe ?? 0);
      return [Number(r.kurikulumId), { jumlahMataKuliah, jumlahObe, jumlahNonObe: jumlahMataKuliah - jumlahObe, totalSks: Number(r.totalSks ?? 0) }];
    })
  );
};

const withRingkasan = async (items) => {
  const ringkasan = await ringkasanMataKuliah(items.map((i) => i.id));
  return items.map((i) => ({ ...i.toJSON(), ...(ringkasan.get(i.id) ?? { jumlahMataKuliah: 0, jumlahObe: 0, jumlahNonObe: 0, totalSks: 0 }) }));
};

const listKurikulum = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) where.nama = { [Op.like]: `%${query.search}%` };
  if (query.jurusanId) where.jurusanId = query.jurusanId;
  if (query.tahunKurikulum) where.tahunKurikulum = query.tahunKurikulum;
  if (query.isActive !== undefined && query.isActive !== '') where.isActive = query.isActive === 'true' || query.isActive === true;

  const { rows, count } = await Kurikulum.findAndCountAll({
    where,
    include: [includeJurusan],
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['tahunKurikulum', 'DESC'], ['nama', 'ASC']]),
    distinct: true,
  });
  return { data: await withRingkasan(rows), meta: getPagingMeta(count, page, limit) };
};

/** Pilihan kurikulum untuk dropdown (prodi sesi bila ada): id, label, prodi, tahun. */
const getKurikulumOptions = async (query = {}) => {
  const where = {};
  if (query.jurusanId) where.jurusanId = query.jurusanId;
  const rows = await Kurikulum.findAll({ where, include: [includeJurusan], order: [['tahunKurikulum', 'DESC'], ['nama', 'ASC']] });
  return rows.map((k) => ({
    value: k.id,
    label: k.nama,
    jurusanId: k.jurusanId,
    prodi: k.jurusan?.namaJurusan ?? null,
    tahunKurikulum: k.tahunKurikulum,
    isActive: k.isActive,
  }));
};

/** Tahun kurikulum yang tersedia (untuk filter), terbaru dulu. */
const getTahunKurikulumOptions = async () => {
  const rows = await sequelize.query(
    'SELECT DISTINCT tahun_kurikulum AS tahun FROM kurikulum WHERE is_delete = 0 AND tahun_kurikulum IS NOT NULL ORDER BY tahun DESC',
    { type: sequelize.QueryTypes.SELECT }
  );
  return rows.map((r) => Number(r.tahun));
};

const getKurikulumById = async (id) => {
  const item = await Kurikulum.findByPk(id, { include: [includeJurusan] });
  if (!item) throw new ApiError(404, 'Kurikulum tidak ditemukan');
  const [withSum] = await withRingkasan([item]);
  return withSum;
};

const ensureUnik = async ({ jurusanId, tahunKurikulum }, excludeId) => {
  if (!tahunKurikulum) return;
  const existing = await Kurikulum.findOne({
    where: { jurusanId: jurusanId ?? null, tahunKurikulum, ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}) },
  });
  if (existing) throw new ApiError(400, `Kurikulum ${tahunKurikulum} untuk prodi ini sudah ada (${existing.nama})`);
};

const namaDefault = async (jurusanId, tahunKurikulum) => {
  const jurusan = jurusanId ? await Jurusan.findByPk(jurusanId) : null;
  return `Kurikulum ${tahunKurikulum ?? ''} ${jurusan?.namaJurusan ?? ''}`.replace(/\s+/g, ' ').trim();
};

const createKurikulum = async (payload, actorId) => {
  await ensureUnik(payload);
  const item = await Kurikulum.create({
    ...payload,
    nama: payload.nama?.trim() || (await namaDefault(payload.jurusanId, payload.tahunKurikulum)),
    createdBy: actorId,
    updatedBy: actorId,
  });
  return getKurikulumById(item.id);
};

const updateKurikulum = async (id, payload, actorId) => {
  const item = await Kurikulum.findByPk(id);
  if (!item) throw new ApiError(404, 'Kurikulum tidak ditemukan');
  await ensureUnik(
    { jurusanId: payload.jurusanId !== undefined ? payload.jurusanId : item.jurusanId, tahunKurikulum: payload.tahunKurikulum ?? item.tahunKurikulum },
    id
  );
  await item.update({ ...payload, ...(payload.nama !== undefined ? { nama: payload.nama.trim() || item.nama } : {}), updatedBy: actorId });
  return getKurikulumById(id);
};

/** Kurikulum hanya bisa dihapus bila mata kuliahnya sudah kosong (hindari jadwal/aktivasi yatim). */
const deleteKurikulum = async (id, actorId) => {
  const item = await Kurikulum.findByPk(id);
  if (!item) throw new ApiError(404, 'Kurikulum tidak ditemukan');
  const jumlah = await MataKuliah.count({ where: { kurikulumId: item.id } });
  if (jumlah) throw new ApiError(400, `Kurikulum masih memiliki ${jumlah} mata kuliah; hapus/pindahkan mata kuliahnya dulu atau nonaktifkan kurikulum`);
  await item.update({ isDelete: true, updatedBy: actorId });
};

/**
 * Cari / buat kurikulum untuk (prodi, tahun) — dipakai import Excel mata kuliah yang hanya
 * membawa Kode Prodi + tahun kurikulum.
 */
const findOrCreateKurikulum = async ({ jurusanId, tahunKurikulum }, actorId) => {
  const existing = await Kurikulum.findOne({ where: { jurusanId: jurusanId ?? null, tahunKurikulum: tahunKurikulum ?? null } });
  if (existing) return existing;
  return Kurikulum.create({
    jurusanId: jurusanId ?? null,
    tahunKurikulum: tahunKurikulum ?? null,
    nama: await namaDefault(jurusanId, tahunKurikulum),
    createdBy: actorId,
    updatedBy: actorId,
  });
};

module.exports = {
  listKurikulum,
  getKurikulumOptions,
  getTahunKurikulumOptions,
  getKurikulumById,
  createKurikulum,
  updateKurikulum,
  deleteKurikulum,
  findOrCreateKurikulum,
};
