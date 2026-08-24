const { Op, fn, col } = require('sequelize');
const { PendaftarSidang, Mahasiswa, JadwalSidang, Dosen } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { buildWorkbook } = require('../utils/excel');

const SORTABLE_COLUMNS = {
  judul: ['judul'],
};

/**
 * `required: false` di-set eksplisit pada tiap include (bukan mengandalkan default Sequelize) —
 * dua belongsTo terpisah ke model Dosen yang sama (pembimbing1/pembimbing2) terbukti tidak
 * selalu di-default sebagai LEFT JOIN, sehingga baris dengan pembimbing2 kosong bisa hilang
 * dari hasil query kalau required tidak dipaksa false.
 */
const INCLUDE = [
  { model: Mahasiswa, as: 'mahasiswa', attributes: ['id', 'nim', 'namaLengkap', 'noTelepon'], required: false },
  {
    model: JadwalSidang,
    as: 'jadwalSidang',
    attributes: ['id', 'tanggal', 'jam', 'ruangan', 'noSk'],
    include: [{ model: Dosen, as: 'dosenPenguji', attributes: ['id', 'namaLengkap', 'nidn'], required: false }],
    required: false,
  },
  { model: Dosen, as: 'pembimbing1', attributes: ['id', 'namaLengkap', 'nidn'], required: false },
  { model: Dosen, as: 'pembimbing2', attributes: ['id', 'namaLengkap', 'nidn'], required: false },
];

const listPendaftarSidang = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where[Op.or] = [
      { '$mahasiswa.nim$': { [Op.like]: `%${query.search}%` } },
      { '$mahasiswa.nama_lengkap$': { [Op.like]: `%${query.search}%` } },
      { judul: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const jadwalSidangWhere = {};
  if (query.tanggal) jadwalSidangWhere.tanggal = query.tanggal;
  if (query.ruangan) jadwalSidangWhere.ruangan = query.ruangan;

  const include = INCLUDE.map((rel) =>
    rel.as === 'jadwalSidang' && Object.keys(jadwalSidangWhere).length
      ? { ...rel, where: jadwalSidangWhere, required: true }
      : rel
  );

  const { rows, count } = await PendaftarSidang.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['id', 'DESC']]),
    subQuery: false,
    distinct: true,
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getPendaftarSidangById = async (id) => {
  const item = await PendaftarSidang.findByPk(id, { include: INCLUDE });
  if (!item) throw new ApiError(404, 'Data tidak ditemukan');
  return item;
};

const createPendaftarSidang = async (payload, actorId) => {
  const created = await PendaftarSidang.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  return getPendaftarSidangById(created.id);
};

const updatePendaftarSidang = async (id, payload, actorId) => {
  const item = await PendaftarSidang.findByPk(id);
  if (!item) throw new ApiError(404, 'Data tidak ditemukan');
  await item.update({ ...payload, updatedBy: actorId });
  return getPendaftarSidangById(id);
};

const deletePendaftarSidang = async (id) => {
  const item = await PendaftarSidang.findByPk(id);
  if (!item) throw new ApiError(404, 'Data tidak ditemukan');
  await item.update({ isDelete: true });
};

/**
 * Opsi untuk dropdown filter "Tanggal Sidang" & "Ruang" di halaman Pendaftar Sidang —
 * diturunkan dari JadwalSidang yang benar-benar ada, bukan diketik manual.
 */
const getFilterOptions = async () => {
  const [tanggalRows, ruanganRows] = await Promise.all([
    JadwalSidang.findAll({ attributes: [[fn('DISTINCT', col('tanggal')), 'tanggal']], order: [['tanggal', 'DESC']], raw: true }),
    JadwalSidang.findAll({
      attributes: [[fn('DISTINCT', col('ruangan')), 'ruangan']],
      where: { ruangan: { [Op.ne]: null } },
      order: [['ruangan', 'ASC']],
      raw: true,
    }),
  ]);
  return {
    tanggal: tanggalRows.map((r) => r.tanggal).filter(Boolean),
    ruangan: ruanganRows.map((r) => r.ruangan).filter(Boolean),
  };
};

const EXPORT_COLUMNS = [
  { header: 'NIM', key: 'nim' },
  { header: 'Nama', key: 'nama' },
  { header: 'No. Telp', key: 'noTelp' },
  { header: 'Judul', key: 'judul' },
  { header: 'Pembimbing', key: 'pembimbing' },
  { header: 'Sidang', key: 'sidang' },
];

const pembimbingLabel = (item) =>
  [item.pembimbing1?.namaLengkap, item.pembimbing2?.namaLengkap].filter(Boolean).join(' & ') || '-';

const sidangLabel = (item) =>
  item.jadwalSidang ? `${item.jadwalSidang.tanggal} ${item.jadwalSidang.jam} - ${item.jadwalSidang.ruangan ?? 'Ruang belum ditentukan'}` : 'Belum Dijadwalkan';

const exportPendaftarSidang = async () => {
  const rows = await PendaftarSidang.findAll({ include: INCLUDE, order: [['id', 'DESC']] });
  const data = rows.map((item) => ({
    nim: item.mahasiswa?.nim ?? '',
    nama: item.mahasiswa?.namaLengkap ?? '',
    noTelp: item.mahasiswa?.noTelepon ?? '',
    judul: item.judul,
    pembimbing: pembimbingLabel(item),
    sidang: sidangLabel(item),
  }));
  return buildWorkbook('Rekap Bimbingan', EXPORT_COLUMNS, data);
};

module.exports = {
  listPendaftarSidang,
  getPendaftarSidangById,
  createPendaftarSidang,
  updatePendaftarSidang,
  deletePendaftarSidang,
  getFilterOptions,
  exportPendaftarSidang,
};
