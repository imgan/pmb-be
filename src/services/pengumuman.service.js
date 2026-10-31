const { Op } = require('sequelize');
const { Pengumuman, Jurusan, Mahasiswa } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = { judul: ['judul'], tanggalTerbit: ['tanggalTerbit'], tanggalBerakhir: ['tanggalBerakhir'] };
const include = [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan'], required: false }];

const hariIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Isi pengumuman berasal dari editor teks BAAK lalu ditampilkan sebagai HTML di portal mahasiswa:
 * buang tag script/style/iframe, atribut event (onclick, ...) dan URL javascript:.
 */
const bersihkanHtml = (html) =>
  String(html ?? '')
    .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|style|iframe|object|embed)[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1="#"');

/** Tanggal (string 'YYYY-MM-DD' atau Date hasil Joi) -> 'YYYY-MM-DD' untuk dibandingkan. */
const keYmd = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));

const normalisasi = (payload) => {
  const data = { ...payload };
  if (data.isi !== undefined) data.isi = bersihkanHtml(data.isi);
  if (data.tanggalBerakhir === '') data.tanggalBerakhir = null;
  if (data.tanggalBerakhir && data.tanggalTerbit && keYmd(data.tanggalBerakhir) < keYmd(data.tanggalTerbit)) {
    throw new ApiError(400, 'Tanggal berakhir tidak boleh sebelum tanggal terbit');
  }
  return data;
};

const listPengumuman = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) where.judul = { [Op.like]: `%${query.search}%` };
  if (query.jurusanId) where.jurusanId = query.jurusanId;
  const { rows, count } = await Pengumuman.findAndCountAll({
    where,
    include,
    limit,
    offset,
    distinct: true,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['tanggalTerbit', 'DESC'], ['id', 'DESC']]),
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getPengumumanById = async (id) => {
  const pengumuman = await Pengumuman.findByPk(id, { include });
  if (!pengumuman) throw new ApiError(404, 'Pengumuman tidak ditemukan');
  return pengumuman;
};

const createPengumuman = async (payload, actorId) => {
  const created = await Pengumuman.create({ ...normalisasi(payload), createdBy: actorId, updatedBy: actorId });
  return getPengumumanById(created.id);
};

const updatePengumuman = async (id, payload, actorId) => {
  const pengumuman = await getPengumumanById(id);
  const data = normalisasi({ tanggalTerbit: pengumuman.tanggalTerbit, ...payload });
  await pengumuman.update({ ...data, updatedBy: actorId });
  return getPengumumanById(id);
};

const deletePengumuman = async (id, actorId) => {
  const pengumuman = await getPengumumanById(id);
  await pengumuman.update({ isDelete: true, updatedBy: actorId });
};

/**
 * Pengumuman yang tayang untuk satu sasaran (MAHASISWA / DOSEN): aktif, sudah terbit, belum
 * berakhir, untuk semua prodi atau prodi tsb. Pengumuman penting di atas, lalu yang terbaru.
 */
const listPengumumanTayang = (untuk, jurusanId) => {
  const today = hariIni();
  return Pengumuman.findAll({
    where: {
      isActive: true,
      untuk: { [Op.in]: ['SEMUA', untuk] },
      tanggalTerbit: { [Op.lte]: today },
      [Op.and]: [
        { [Op.or]: [{ tanggalBerakhir: null }, { tanggalBerakhir: { [Op.gte]: today } }] },
        { [Op.or]: [{ jurusanId: null }, { jurusanId }] },
      ],
    },
    attributes: ['id', 'judul', 'isi', 'tanggalTerbit', 'tanggalBerakhir', 'isPenting', 'jurusanId', 'untuk'],
    include,
    order: [
      ['isPenting', 'DESC'],
      ['tanggalTerbit', 'DESC'],
      ['id', 'DESC'],
    ],
  });
};

const listPengumumanMahasiswa = async (mahasiswaId) => {
  const mahasiswa = await Mahasiswa.findByPk(mahasiswaId, { attributes: ['id', 'jurusanId'] });
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa tidak ditemukan');
  return listPengumumanTayang('MAHASISWA', mahasiswa.jurusanId);
};

module.exports = { listPengumumanTayang, listPengumuman, getPengumumanById, createPengumuman, updatePengumuman, deletePengumuman, listPengumumanMahasiswa };
