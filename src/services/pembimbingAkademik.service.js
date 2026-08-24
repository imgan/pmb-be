const { Op } = require('sequelize');
const { PembimbingAkademik, Dosen, Mahasiswa, Jurusan } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const SORTABLE_COLUMNS = {
  noSk: ['noSk'],
  tanggalSk: ['tanggalSk'],
};

const INCLUDE = [{ model: Dosen, as: 'dosen', attributes: ['id', 'namaLengkap', 'nidn'], required: false }];

/**
 * "Prodi" & "Jumlah Mahasiswa" diturunkan dari mahasiswa yang benar-benar menunjuk
 * pembimbing_akademik_id ini (bukan kolom tersimpan) — supaya selalu sinkron. Penugasan
 * mahasiswa ke pembimbing akademik dilakukan lewat data mahasiswa, bukan dari form ini.
 */
const attachMahasiswaSummary = async (rows) => {
  const ids = rows.map((r) => r.id);
  if (!ids.length) return rows.map((row) => ({ ...(row.toJSON ? row.toJSON() : row), jumlahMahasiswa: 0, prodi: [] }));

  const mahasiswaRows = await Mahasiswa.findAll({
    attributes: ['pembimbingAkademikId'],
    where: { pembimbingAkademikId: { [Op.in]: ids } },
    include: [{ model: Jurusan, as: 'jurusan', attributes: ['namaJurusan'] }],
    raw: true,
    nest: true,
  });

  const summaryMap = new Map(ids.map((id) => [id, { total: 0, prodi: new Set() }]));
  mahasiswaRows.forEach((row) => {
    const entry = summaryMap.get(row.pembimbingAkademikId);
    if (!entry) return;
    entry.total += 1;
    if (row.jurusan?.namaJurusan) entry.prodi.add(row.jurusan.namaJurusan);
  });

  return rows.map((row) => {
    const plain = row.toJSON ? row.toJSON() : row;
    const entry = summaryMap.get(row.id);
    plain.jumlahMahasiswa = entry?.total ?? 0;
    plain.prodi = entry ? [...entry.prodi] : [];
    return plain;
  });
};

const listPembimbingAkademik = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where[Op.or] = [
      { '$dosen.nama_lengkap$': { [Op.like]: `%${query.search}%` } },
      { '$dosen.nidn$': { [Op.like]: `%${query.search}%` } },
      { noSk: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await PembimbingAkademik.findAndCountAll({
    where,
    include: INCLUDE,
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['id', 'DESC']]),
    subQuery: false,
    distinct: true,
  });

  const data = await attachMahasiswaSummary(rows);
  return { data, meta: getPagingMeta(count, page, limit) };
};

const getPembimbingAkademikById = async (id) => {
  const item = await PembimbingAkademik.findByPk(id, { include: INCLUDE });
  if (!item) throw new ApiError(404, 'Data tidak ditemukan');
  const [withSummary] = await attachMahasiswaSummary([item]);
  return withSummary;
};

const createPembimbingAkademik = async (payload, actorId) => {
  const created = await PembimbingAkademik.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  return getPembimbingAkademikById(created.id);
};

const updatePembimbingAkademik = async (id, payload, actorId) => {
  const item = await PembimbingAkademik.findByPk(id);
  if (!item) throw new ApiError(404, 'Data tidak ditemukan');
  await item.update({ ...payload, updatedBy: actorId });
  return getPembimbingAkademikById(id);
};

const deletePembimbingAkademik = async (id) => {
  const item = await PembimbingAkademik.findByPk(id);
  if (!item) throw new ApiError(404, 'Data tidak ditemukan');
  await item.update({ isDelete: true });
};

module.exports = {
  listPembimbingAkademik,
  getPembimbingAkademikById,
  createPembimbingAkademik,
  updatePembimbingAkademik,
  deletePembimbingAkademik,
};
