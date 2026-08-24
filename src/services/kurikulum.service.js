const { Op } = require('sequelize');
const { Kurikulum, Jurusan, TahunAjaran, JadwalKuliah } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

/**
 * `required: false` di-set eksplisit pada tiap include — beberapa belongsTo sekaligus tanpa
 * itu terbukti bisa membuat Sequelize men-default salah satunya jadi INNER JOIN, sehingga baris
 * dengan FK nullable yang kosong (mis. jurusanId belum diisi) hilang dari hasil query.
 */
const includeRelations = [
  { model: Jurusan, as: 'jurusan', required: false },
  { model: TahunAjaran, as: 'tahunAjaran', required: false },
];

const SORTABLE_COLUMNS = {
  kode: ['kode'],
  mataKuliah: ['mataKuliah'],
  semester: ['semester'],
  tahunAjaran: [{ model: TahunAjaran, as: 'tahunAjaran' }, 'nama'],
};

const listKurikulum = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where[Op.or] = [
      { kode: { [Op.like]: `%${query.search}%` } },
      { mataKuliah: { [Op.like]: `%${query.search}%` } },
    ];
  }
  if (query.jurusanId) where.jurusanId = query.jurusanId;
  if (query.tahunAjaranId) where.tahunAjaranId = query.tahunAjaranId;
  if (query.semester) where.semester = query.semester;

  const { rows, count } = await Kurikulum.findAndCountAll({
    where,
    include: includeRelations,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['id', 'DESC']]),
    subQuery: false,
    distinct: true,
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

/**
 * "Matakuliah Aktif" = mata kuliah dari kurikulum (difilter Prodi/Tahun Kurikulum/Semester
 * Kurikulum) yang benar-benar dijadwalkan (punya JadwalKuliah) pada tahun akademik + semester
 * aktif yang dipilih. Join dilakukan lewat kode matakuliah karena Kurikulum.kode dan
 * JadwalKuliah.kodeMataKuliah sama-sama string, tidak ada FK langsung antar keduanya.
 */
const listMatakuliahAktif = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.jurusanId) where.jurusanId = query.jurusanId;
  if (query.tahunAjaranId) where.tahunAjaranId = query.tahunAjaranId;
  if (query.semester) where.semester = query.semester;
  if (query.search) {
    where[Op.or] = [
      { kode: { [Op.like]: `%${query.search}%` } },
      { mataKuliah: { [Op.like]: `%${query.search}%` } },
    ];
  }

  if (query.aktifTahunAjaranId && query.aktifSemester) {
    const jadwalRows = await JadwalKuliah.findAll({
      where: { tahunAjaranId: query.aktifTahunAjaranId, semester: query.aktifSemester },
      attributes: ['kodeMataKuliah'],
      group: ['kodeMataKuliah'],
      raw: true,
    });
    const activeKodeList = jadwalRows.map((r) => r.kodeMataKuliah);
    where.kode = { [Op.in]: activeKodeList.length ? activeKodeList : [''] };
  }

  const { rows, count } = await Kurikulum.findAndCountAll({
    where,
    include: includeRelations,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['mataKuliah', 'ASC']]),
    subQuery: false,
    distinct: true,
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getKurikulumById = async (id) => {
  const item = await Kurikulum.findByPk(id, { include: includeRelations });
  if (!item) throw new ApiError(404, 'Data kurikulum tidak ditemukan');
  return item;
};

const createKurikulum = async (payload, actorId) => {
  const item = await Kurikulum.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  return getKurikulumById(item.id);
};

const updateKurikulum = async (id, payload, actorId) => {
  const item = await getKurikulumById(id);
  await item.update({ ...payload, updatedBy: actorId });
  return getKurikulumById(id);
};

const deleteKurikulum = async (id) => {
  const item = await getKurikulumById(id);
  await item.update({ isDelete: true });
};

module.exports = {
  listKurikulum,
  listMatakuliahAktif,
  getKurikulumById,
  createKurikulum,
  updateKurikulum,
  deleteKurikulum,
};
