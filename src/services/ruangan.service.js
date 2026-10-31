const { Op } = require('sequelize');
const { Ruangan, JadwalKuliah } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = {
  namaRuang: ['namaRuang'],
  kampus: ['kampus'],
  lantai: ['lantai'],
  projector: ['projector'],
  keterangan: ['keterangan'],
  fungsi: ['fungsi'],
  kursi: ['kursi'],
};

const listRuangan = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    const like = { [Op.like]: `%${query.search}%` };
    where[Op.or] = [{ namaRuang: like }, { kampus: like }, { keterangan: like }, { fungsi: like }];
  }

  const { rows, count } = await Ruangan.findAndCountAll({
    where,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['namaRuang', 'ASC']]),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getRuanganById = async (id) => {
  const ruangan = await Ruangan.findByPk(id);
  if (!ruangan) throw new ApiError(404, 'Ruangan not found');
  return ruangan;
};

/** Nama ruang unik di antara ruangan yang belum dihapus. */
const ensureNamaUnik = async (namaRuang, exceptId) => {
  if (!namaRuang) return;
  const where = { namaRuang };
  if (exceptId) where.id = { [Op.ne]: exceptId };
  if (await Ruangan.findOne({ where })) throw new ApiError(409, `Ruang ${namaRuang} sudah ada`);
};

const createRuangan = async (payload, actorId) => {
  await ensureNamaUnik(payload.namaRuang);
  return Ruangan.create({ ...payload, createdBy: actorId, updatedBy: actorId });
};

const updateRuangan = async (id, payload, actorId) => {
  const ruangan = await getRuanganById(id);
  await ensureNamaUnik(payload.namaRuang, ruangan.id);
  const namaLama = ruangan.namaRuang;
  await ruangan.update({ ...payload, updatedBy: actorId });
  // Jadwal kuliah menyimpan nama ruang: ganti nama di master ikut mengganti jadwal yang memakainya.
  if (payload.namaRuang && payload.namaRuang !== namaLama) {
    await JadwalKuliah.unscoped().update({ ruangan: payload.namaRuang }, { where: { ruangan: namaLama } });
  }
  return ruangan;
};

const deleteRuangan = async (id, actorId) => {
  const ruangan = await getRuanganById(id);
  await ruangan.update({ isDelete: true, updatedBy: actorId });
};

/** Pilihan ruangan untuk form jadwal kuliah (value = nama ruang yang disimpan di jadwal). */
const getRuanganOptions = async () => {
  const rows = await Ruangan.findAll({ order: [['kampus', 'ASC'], ['namaRuang', 'ASC']] });
  return rows.map((r) => {
    const info = [r.kampus && `Kampus ${r.kampus}`, r.keterangan && r.keterangan !== r.namaRuang && r.keterangan, r.kursi && `${r.kursi} kursi`]
      .filter(Boolean)
      .join(' · ');
    return { value: r.namaRuang, label: info ? `${r.namaRuang} — ${info}` : r.namaRuang };
  });
};

module.exports = { getRuanganOptions, listRuangan, getRuanganById, createRuangan, updateRuangan, deleteRuangan };
