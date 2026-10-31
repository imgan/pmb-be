const { Op } = require('sequelize');
const { NilaiMagang, Mahasiswa, Jurusan, TahunAjaran, PembimbingMagang, Dosen, BimbinganMagang } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');
const { gradeFor } = require('../utils/gradeScale');

const INCLUDE = [
  {
    model: Mahasiswa,
    as: 'mahasiswa',
    attributes: ['id', 'nim', 'namaLengkap', 'jurusanId'],
    required: false,
    include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan'], required: false }],
  },
  { model: TahunAjaran, as: 'tahunAjaran', attributes: ['id', 'nama', 'jenisSemester'], required: false },
  {
    model: PembimbingMagang,
    as: 'pembimbingMagang',
    attributes: ['id'],
    required: false,
    include: [{ model: Dosen, as: 'dosen', attributes: ['id', 'namaLengkap', 'nidn'], required: false }],
  },
];

const SORTABLE_COLUMNS = {
  nim: [{ model: Mahasiswa, as: 'mahasiswa' }, 'nim'],
  namaLengkap: [{ model: Mahasiswa, as: 'mahasiswa' }, 'namaLengkap'],
  lokasi: ['lokasi'],
  semester: ['semester'],
  nilai: ['nilai'],
  grade: ['grade'],
};

const listNilaiMagang = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.tahunAjaranId) where.tahunAjaranId = query.tahunAjaranId;
  const mahasiswaWhere = {};
  if (query.jurusanId) mahasiswaWhere.jurusanId = query.jurusanId;
  if (query.search) {
    const like = { [Op.like]: `%${query.search}%` };
    where[Op.or] = [
      { judul: like },
      { lokasi: like },
      { '$mahasiswa.nim$': like },
      { '$mahasiswa.nama_lengkap$': like },
    ];
  }

  const { rows, count } = await NilaiMagang.findAndCountAll({
    where,
    include: [{ ...INCLUDE[0], where: query.jurusanId ? mahasiswaWhere : undefined, required: !!query.jurusanId }, INCLUDE[1], INCLUDE[2]],
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [['createdAt', 'DESC']]),
    subQuery: false,
    distinct: true,
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const getNilaiMagangById = async (id) => {
  const item = await NilaiMagang.findByPk(id, { include: INCLUDE });
  if (!item) throw new ApiError(404, 'Data nilai magang tidak ditemukan');
  return item;
};

/** Grade selalu dihitung dari nilai angka (skala nilai kampus) supaya konsisten dengan KHS. */
const withGrade = (payload) => {
  if (payload.nilai === undefined) return payload;
  const nilai = payload.nilai === null || payload.nilai === '' ? null : Number(payload.nilai);
  return { ...payload, nilai, grade: nilai === null ? null : gradeFor(nilai) };
};

const assertMahasiswa = async (mahasiswaId) => {
  if (!mahasiswaId) return;
  const mahasiswa = await Mahasiswa.findByPk(mahasiswaId, { attributes: ['id'] });
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa tidak ditemukan');
};

const assertPeriode = (tanggalMulai, tanggalSelesai) => {
  if (tanggalMulai && tanggalSelesai && new Date(tanggalSelesai) < new Date(tanggalMulai)) {
    throw new ApiError(400, 'Tanggal selesai tidak boleh sebelum tanggal mulai');
  }
};

const createNilaiMagang = async (payload, actorId) => {
  await assertMahasiswa(payload.mahasiswaId);
  assertPeriode(payload.tanggalMulai, payload.tanggalSelesai);
  const item = await NilaiMagang.create({ ...withGrade(payload), createdBy: actorId, updatedBy: actorId });
  return getNilaiMagangById(item.id);
};

const updateNilaiMagang = async (id, payload, actorId) => {
  const item = await getNilaiMagangById(id);
  await assertMahasiswa(payload.mahasiswaId);
  assertPeriode(payload.tanggalMulai ?? item.tanggalMulai, payload.tanggalSelesai ?? item.tanggalSelesai);
  await item.update({ ...withGrade(payload), updatedBy: actorId });
  return getNilaiMagangById(id);
};

const deleteNilaiMagang = async (id) => {
  const item = await getNilaiMagangById(id);
  await item.update({ isDelete: true });
};

/** Data awal form saat mahasiswa dipilih: judul & dosen pembimbing dari Bimbingan Magang terbaru (bila ada). */
const getPrefill = async (mahasiswaId) => {
  const bimbingan = await BimbinganMagang.findOne({ where: { mahasiswaId }, order: [['createdAt', 'DESC']] });
  return { judul: bimbingan?.judul ?? null, pembimbingMagangId: bimbingan?.pembimbingMagangId ?? null };
};

module.exports = { listNilaiMagang, getNilaiMagangById, createNilaiMagang, updateNilaiMagang, deleteNilaiMagang, getPrefill };
