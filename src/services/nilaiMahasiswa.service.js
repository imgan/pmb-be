const { Op, fn, col } = require('sequelize');
const { Mahasiswa, NilaiMahasiswa, GolonganKelas, Jurusan } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveOrder } = require('../utils/sorting');

const kelasLabel = (mahasiswa) =>
  [mahasiswa.golonganKelas?.namaKelas, mahasiswa.jurusan?.namaJurusan].filter(Boolean).join(' / ');

const searchMahasiswa = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) {
    where[Op.or] = [
      { nim: { [Op.like]: `%${query.search}%` } },
      { namaLengkap: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await Mahasiswa.findAndCountAll({
    where,
    include: [
      { model: GolonganKelas, as: 'golonganKelas' },
      { model: Jurusan, as: 'jurusan' },
    ],
    limit,
    offset,
    order: [['namaLengkap', 'ASC']],
  });

  const data = rows.map((m) => ({
    id: m.id,
    nim: m.nim,
    namaLengkap: m.namaLengkap,
    kelas: kelasLabel(m),
    programStudi: m.jurusan?.namaJurusan ?? null,
  }));

  return { data, meta: getPagingMeta(count, page, limit) };
};

const SORTABLE_COLUMNS = {
  kodeMataKuliah: ['kodeMataKuliah'],
  namaMataKuliah: ['namaMataKuliah'],
  sks: ['sks'],
  semester: ['semester'],
  partisipatif: ['partisipatif'],
  proyek: ['proyek'],
  quiz: ['quiz'],
  tugas: ['tugas'],
  uts: ['uts'],
  uas: ['uas'],
  nilai: ['nilai'],
  grade: ['grade'],
};

const getNilaiByMahasiswa = async (mahasiswaId, query) => {
  const mahasiswa = await Mahasiswa.findByPk(mahasiswaId, {
    include: [
      { model: GolonganKelas, as: 'golonganKelas' },
      { model: Jurusan, as: 'jurusan' },
    ],
  });
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa not found');

  const { page, limit, offset } = getPagination(query);
  const { rows, count } = await NilaiMahasiswa.findAndCountAll({
    where: { mahasiswaId },
    limit,
    offset,
    order: resolveOrder(query, SORTABLE_COLUMNS, [
      ['semester', 'ASC'],
      ['kodeMataKuliah', 'ASC'],
    ]),
  });

  return {
    mahasiswa: {
      id: mahasiswa.id,
      nim: mahasiswa.nim,
      namaLengkap: mahasiswa.namaLengkap,
      programStudi: mahasiswa.jurusan?.namaJurusan ?? null,
      kelas: kelasLabel(mahasiswa),
    },
    nilai: rows,
    meta: getPagingMeta(count, page, limit),
  };
};

const round2 = (value) => Math.round(value * 100) / 100;

/**
 * Formula & ambang grade yang sama persis dengan yang dipakai seeder data nilai
 * (partisipatif 10% + tugas 20% + uts 30% + uas 40%) — proyek & quiz tersimpan tapi belum
 * ikut komponen nilai akhir, konsisten dengan data yang sudah ada di sistem ini.
 */
const computeNilai = ({ partisipatif, tugas, uts, uas }) =>
  round2(partisipatif * 0.1 + tugas * 0.2 + uts * 0.3 + uas * 0.4);

const gradeFor = (nilai) => {
  if (nilai >= 85) return 'A';
  if (nilai >= 70) return 'B';
  if (nilai >= 55) return 'C';
  if (nilai >= 40) return 'D';
  return 'E';
};

const NILAI_ENTRY_SORTABLE_COLUMNS = {
  namaMataKuliah: ['namaMataKuliah'],
  kodeMataKuliah: ['kodeMataKuliah'],
};

/**
 * Untuk halaman "Update Nilai" — cari per-baris nilai_mahasiswa (bukan per-mahasiswa),
 * supaya admin bisa langsung mengedit satu entri nilai pada satu mata kuliah tertentu.
 */
const searchNilaiEntries = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.kodeMataKuliah) {
    where.kodeMataKuliah = { [Op.like]: `%${query.kodeMataKuliah}%` };
  }

  const mahasiswaWhere = {};
  if (query.nim) mahasiswaWhere.nim = { [Op.like]: `%${query.nim}%` };
  if (query.search) {
    where[Op.or] = [
      { '$mahasiswa.nim$': { [Op.like]: `%${query.search}%` } },
      { '$mahasiswa.nama_lengkap$': { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await NilaiMahasiswa.findAndCountAll({
    where,
    include: [
      {
        model: Mahasiswa,
        as: 'mahasiswa',
        attributes: ['id', 'nim', 'namaLengkap'],
        where: Object.keys(mahasiswaWhere).length ? mahasiswaWhere : undefined,
        required: true,
      },
    ],
    limit,
    offset,
    order: resolveOrder(query, NILAI_ENTRY_SORTABLE_COLUMNS, [['id', 'DESC']]),
    subQuery: false,
    distinct: true,
  });

  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const updateNilaiEntry = async (id, payload, actorId) => {
  const entry = await NilaiMahasiswa.findByPk(id, {
    include: [{ model: Mahasiswa, as: 'mahasiswa', attributes: ['id', 'nim', 'namaLengkap'] }],
  });
  if (!entry) throw new ApiError(404, 'Data nilai not found');

  const merged = {
    partisipatif: payload.partisipatif ?? entry.partisipatif,
    proyek: payload.proyek ?? entry.proyek,
    quiz: payload.quiz ?? entry.quiz,
    tugas: payload.tugas ?? entry.tugas,
    uts: payload.uts ?? entry.uts,
    uas: payload.uas ?? entry.uas,
  };
  const nilai = computeNilai(merged);

  await entry.update({ ...merged, nilai, grade: gradeFor(nilai), updatedBy: actorId });
  return entry;
};

const getSemesterSummary = async () => {
  const rows = await NilaiMahasiswa.findAll({
    attributes: ['semester', [fn('AVG', col('nilai')), 'rataRata'], [fn('COUNT', col('id')), 'total']],
    group: ['semester'],
    order: [['semester', 'ASC']],
    raw: true,
  });
  return rows.map((row) => ({
    semester: Number(row.semester),
    rataRata: Math.round(Number(row.rataRata) * 100) / 100,
    total: Number(row.total),
  }));
};

module.exports = {
  searchMahasiswa,
  getNilaiByMahasiswa,
  getSemesterSummary,
  searchNilaiEntries,
  updateNilaiEntry,
};
