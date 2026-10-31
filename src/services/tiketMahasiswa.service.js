const { Op } = require('sequelize');
const { TiketMahasiswa, Mahasiswa, Jurusan, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

/**
 * Tiket bantuan mahasiswa: diajukan dari portal mahasiswa, diproses petugas di modul SIM.
 * Mahasiswa hanya bisa melihat tiketnya sendiri dan membatalkan tiket yang belum ditanggapi.
 */

const includeStaff = [
  {
    model: Mahasiswa,
    as: 'mahasiswa',
    attributes: ['id', 'nim', 'namaLengkap'],
    include: [{ model: Jurusan, as: 'jurusan', attributes: ['namaJurusan'], required: false }],
  },
  { model: User, as: 'petugas', attributes: ['id', 'name'], required: false },
];

const nomorTiket = (t) => `TKT-${new Date(t.createdAt).getFullYear()}-${String(t.id).padStart(6, '0')}`;

// ---- Portal mahasiswa ----

const listTiketMahasiswa = (mahasiswaId) =>
  TiketMahasiswa.findAll({
    where: { mahasiswaId },
    include: [{ model: User, as: 'petugas', attributes: ['id', 'name'], required: false }],
    order: [['id', 'DESC']],
  });

const createTiketMahasiswa = async (mahasiswaId, { jenisKebutuhan, uraian }) => {
  const tiket = await TiketMahasiswa.create({ mahasiswaId, jenisKebutuhan, uraian });
  await tiket.update({ nomorTiket: nomorTiket(tiket) });
  return tiket;
};

const batalkanTiketMahasiswa = async (mahasiswaId, id) => {
  const tiket = await TiketMahasiswa.findOne({ where: { id, mahasiswaId } });
  if (!tiket) throw new ApiError(404, 'Tiket tidak ditemukan');
  if (tiket.status !== 'BARU') throw new ApiError(400, 'Tiket yang sudah ditanggapi petugas tidak bisa dibatalkan');
  await tiket.destroy();
};

// ---- Petugas (modul SIM) ----

const SORTABLE_COLUMNS = { nomorTiket: ['nomorTiket'], createdAt: ['createdAt'], status: ['status'], jenisKebutuhan: ['jenisKebutuhan'] };

const listTiket = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.status) where.status = query.status;
  if (query.jenisKebutuhan) where.jenisKebutuhan = query.jenisKebutuhan;
  if (query.search) {
    const like = { [Op.like]: `%${query.search}%` };
    where[Op.or] = [{ nomorTiket: like }, { uraian: like }, { '$mahasiswa.nim$': like }, { '$mahasiswa.nama_lengkap$': like }];
  }
  const { rows, count } = await TiketMahasiswa.findAndCountAll({
    where,
    include: includeStaff,
    limit,
    offset,
    distinct: true,
    subQuery: false,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['id', 'DESC']]),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getTiketById = async (id) => {
  const tiket = await TiketMahasiswa.findByPk(id, { include: includeStaff });
  if (!tiket) throw new ApiError(404, 'Tiket tidak ditemukan');
  return tiket;
};

const tanggapiTiket = async (id, { status, tanggapan }, actorId) => {
  const tiket = await getTiketById(id);
  if (status === 'DITOLAK' && !String(tanggapan ?? '').trim()) throw new ApiError(400, 'Isi alasan penolakan tiket');
  await tiket.update({ status, tanggapan: tanggapan || null, petugasId: actorId, tanggalDitanggapi: new Date() });
  return getTiketById(id);
};

/** Ringkasan jumlah tiket per status (badge di halaman SIM). */
const ringkasanStatus = async () => {
  const rows = await TiketMahasiswa.findAll({
    attributes: ['status', [TiketMahasiswa.sequelize.fn('COUNT', TiketMahasiswa.sequelize.col('id')), 'jumlah']],
    group: ['status'],
    raw: true,
  });
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.jumlah)]));
};

module.exports = { listTiketMahasiswa, createTiketMahasiswa, batalkanTiketMahasiswa, listTiket, getTiketById, tanggapiTiket, ringkasanStatus };
