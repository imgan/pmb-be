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
 * mahasiswa ke pembimbing akademik lewat "Atur Mahasiswa" (listMahasiswaBimbingan / setMahasiswaBimbingan).
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

/**
 * Daftar mahasiswa aktif untuk diatur ke pembimbing akademik `id`.
 * status: 'bimbingan' (sudah dibimbing PA ini) | 'belum' (belum punya PA) | 'semua'.
 * jurusanId (array dari prodiScope untuk akun Prodi) membatasi ke prodi tsb.
 */
const listMahasiswaBimbingan = async (id, query = {}) => {
  const pa = await PembimbingAkademik.findByPk(id);
  if (!pa) throw new ApiError(404, 'Data tidak ditemukan');
  const where = { isActive: true };
  if (query.status === 'bimbingan') where.pembimbingAkademikId = pa.id;
  if (query.status === 'belum') where.pembimbingAkademikId = null;
  if (query.jurusanId) where.jurusanId = query.jurusanId;
  if (query.angkatan) where.tahunMasuk = Number(query.angkatan);
  if (query.search) {
    where[Op.or] = [{ nim: { [Op.like]: `%${query.search}%` } }, { namaLengkap: { [Op.like]: `%${query.search}%` } }];
  }
  const rows = await Mahasiswa.findAll({
    where,
    attributes: ['id', 'nim', 'namaLengkap', 'tahunMasuk', 'jurusanId', 'pembimbingAkademikId'],
    include: [
      { model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan'], required: false },
      {
        model: PembimbingAkademik,
        as: 'pembimbingAkademik',
        attributes: ['id'],
        required: false,
        include: [{ model: Dosen, as: 'dosen', attributes: ['id', 'namaLengkap'], required: false }],
      },
    ],
    order: [
      ['tahunMasuk', 'DESC'],
      ['nim', 'ASC'],
    ],
  });
  return rows.map((m) => ({
    id: m.id,
    nim: m.nim,
    namaLengkap: m.namaLengkap,
    angkatan: m.tahunMasuk,
    prodi: m.jurusan?.namaJurusan ?? null,
    pembimbingAkademikId: m.pembimbingAkademikId,
    pembimbing: m.pembimbingAkademik?.dosen?.namaLengkap ?? null,
  }));
};

/**
 * Tetapkan (`tambah`) / lepas (`hapus`) mahasiswa dari pembimbing akademik `id`. Menetapkan
 * mahasiswa yang sudah punya PA lain = memindahkan pembimbingnya. Untuk akun Prodi, hanya
 * mahasiswa dari prodinya yang diproses (scopeJurusanIds dari prodiScope).
 */
const setMahasiswaBimbingan = async (id, { tambah = [], hapus = [] }, actorId, scopeJurusanIds) => {
  const pa = await PembimbingAkademik.findByPk(id);
  if (!pa) throw new ApiError(404, 'Data tidak ditemukan');
  const scope = scopeJurusanIds ? { jurusanId: [].concat(scopeJurusanIds).map(Number) } : {};
  let ditetapkan = 0;
  let dilepas = 0;
  if (tambah.length) {
    [ditetapkan] = await Mahasiswa.update(
      { pembimbingAkademikId: pa.id, updatedBy: actorId },
      { where: { id: { [Op.in]: tambah }, ...scope } }
    );
  }
  if (hapus.length) {
    [dilepas] = await Mahasiswa.update(
      { pembimbingAkademikId: null, updatedBy: actorId },
      { where: { id: { [Op.in]: hapus }, pembimbingAkademikId: pa.id, ...scope } }
    );
  }
  return { ditetapkan, dilepas };
};

module.exports = {
  listMahasiswaBimbingan,
  setMahasiswaBimbingan,
  listPembimbingAkademik,
  getPembimbingAkademikById,
  createPembimbingAkademik,
  updatePembimbingAkademik,
  deletePembimbingAkademik,
};
