const { Op, fn, col } = require('sequelize');
const { PembimbingTaSkripsi, Dosen, PendaftarSidang } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { buildWorkbook } = require('../utils/excel');

const SORTABLE_COLUMNS = {
  noSk: ['noSk'],
  tanggalSk: ['tanggalSk'],
  periodeMulai: ['periodeMulai'],
};

const INCLUDE = [{ model: Dosen, as: 'dosen', attributes: ['id', 'namaLengkap', 'nidn'], required: false }];

/**
 * "Total Bimbingan" = jumlah mahasiswa yang SEDANG dibimbing dosen ini untuk sidang TA/skripsi,
 * diturunkan langsung dari PendaftarSidang.pembimbing1Id/pembimbing2Id — bukan kolom tersimpan,
 * supaya selalu sinkron dengan data pendaftar sidang yang sebenarnya.
 */
const getTotalBimbinganMap = async (dosenIds) => {
  if (!dosenIds.length) return new Map();
  const [rows1, rows2] = await Promise.all([
    PendaftarSidang.findAll({
      attributes: ['pembimbing1Id', [fn('COUNT', col('id')), 'total']],
      where: { pembimbing1Id: { [Op.in]: dosenIds } },
      group: ['pembimbing1Id'],
      raw: true,
    }),
    PendaftarSidang.findAll({
      attributes: ['pembimbing2Id', [fn('COUNT', col('id')), 'total']],
      where: { pembimbing2Id: { [Op.in]: dosenIds } },
      group: ['pembimbing2Id'],
      raw: true,
    }),
  ]);
  const map = new Map(dosenIds.map((id) => [id, 0]));
  rows1.forEach((r) => map.set(r.pembimbing1Id, (map.get(r.pembimbing1Id) || 0) + Number(r.total)));
  rows2.forEach((r) => map.set(r.pembimbing2Id, (map.get(r.pembimbing2Id) || 0) + Number(r.total)));
  return map;
};

const attachTotalBimbingan = async (rows) => {
  const dosenIds = [...new Set(rows.map((r) => r.dosenId))];
  const totalMap = await getTotalBimbinganMap(dosenIds);
  return rows.map((row) => {
    const plain = row.toJSON ? row.toJSON() : row;
    plain.totalBimbingan = totalMap.get(row.dosenId) ?? 0;
    return plain;
  });
};

const listPembimbingTaSkripsi = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.periodeMulai) where.periodeMulai = query.periodeMulai;
  if (query.periodeSelesai) where.periodeSelesai = query.periodeSelesai;
  if (query.search) {
    where[Op.or] = [
      { '$dosen.nama_lengkap$': { [Op.like]: `%${query.search}%` } },
      { '$dosen.nidn$': { [Op.like]: `%${query.search}%` } },
      { noSk: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await PembimbingTaSkripsi.findAndCountAll({
    where,
    include: INCLUDE,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['periodeMulai', 'DESC']]),
    subQuery: false,
    distinct: true,
  });

  const data = await attachTotalBimbingan(rows);
  return { data, meta: getPagingMeta(count, page, limit) };
};

const getPembimbingTaSkripsiById = async (id) => {
  const item = await PembimbingTaSkripsi.findByPk(id, { include: INCLUDE });
  if (!item) throw new ApiError(404, 'Data tidak ditemukan');
  const [withTotal] = await attachTotalBimbingan([item]);
  return withTotal;
};

const createPembimbingTaSkripsi = async (payload, actorId) => {
  const created = await PembimbingTaSkripsi.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  return getPembimbingTaSkripsiById(created.id);
};

const updatePembimbingTaSkripsi = async (id, payload, actorId) => {
  const item = await PembimbingTaSkripsi.findByPk(id);
  if (!item) throw new ApiError(404, 'Data tidak ditemukan');
  await item.update({ ...payload, updatedBy: actorId });
  return getPembimbingTaSkripsiById(id);
};

const deletePembimbingTaSkripsi = async (id) => {
  const item = await PembimbingTaSkripsi.findByPk(id);
  if (!item) throw new ApiError(404, 'Data tidak ditemukan');
  await item.update({ isDelete: true });
};

/**
 * Opsi dropdown filter "Periode" — daftar rentang periode yang benar-benar pernah dipakai,
 * diurutkan & diberi nomor urut di sisi frontend (mis. "[2] 1 Sep 2024 s/d 30 Nov 2024").
 */
const getFilterOptions = async () => {
  const rows = await PembimbingTaSkripsi.findAll({
    attributes: ['periodeMulai', 'periodeSelesai'],
    group: ['periodeMulai', 'periodeSelesai'],
    order: [['periodeMulai', 'ASC']],
    raw: true,
  });
  return rows;
};

const EXPORT_COLUMNS = [
  { header: 'Nama Dosen', key: 'namaDosen' },
  { header: 'No. SK', key: 'noSk' },
  { header: 'Pembimbing Ke', key: 'pembimbingKe' },
  { header: 'Total Bimbingan', key: 'totalBimbingan' },
  { header: 'Periode', key: 'periode' },
  { header: 'Tanggal SK', key: 'tanggalSk' },
];

const exportPembimbingTaSkripsi = async () => {
  const rows = await PembimbingTaSkripsi.findAll({ include: INCLUDE, order: [['periodeMulai', 'DESC']] });
  const withTotal = await attachTotalBimbingan(rows);
  const data = withTotal.map((item) => ({
    namaDosen: item.dosen?.namaLengkap ?? '',
    noSk: item.noSk ?? '',
    pembimbingKe: item.pembimbingKe === 'UTAMA' ? 'Utama' : 'Pendamping',
    totalBimbingan: item.totalBimbingan,
    periode: `${item.periodeMulai} s/d ${item.periodeSelesai}`,
    tanggalSk: item.tanggalSk ?? '',
  }));
  return buildWorkbook('Pembimbing TA-Skripsi', EXPORT_COLUMNS, data);
};

module.exports = {
  listPembimbingTaSkripsi,
  getPembimbingTaSkripsiById,
  createPembimbingTaSkripsi,
  updatePembimbingTaSkripsi,
  deletePembimbingTaSkripsi,
  getFilterOptions,
  exportPembimbingTaSkripsi,
};
