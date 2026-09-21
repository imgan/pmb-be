const { Op } = require('sequelize');
const { Mahasiswa, NilaiMahasiswa, GolonganKelas, Jurusan } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { GRADE_BOBOT } = require('../utils/gradeScale');

const kelasLabel = (mahasiswa) =>
  [mahasiswa.golonganKelas?.namaKelas, mahasiswa.jurusan?.namaJurusan].filter(Boolean).join(' / ');

const searchMahasiswa = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  const andConditions = [];
  if (query.nim) andConditions.push({ nim: { [Op.like]: `%${query.nim}%` } });
  if (query.nama) andConditions.push({ namaLengkap: { [Op.like]: `%${query.nama}%` } });
  if (query.search) {
    andConditions.push({
      [Op.or]: [
        { nim: { [Op.like]: `%${query.search}%` } },
        { namaLengkap: { [Op.like]: `%${query.search}%` } },
      ],
    });
  }
  if (andConditions.length) where[Op.and] = andConditions;

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

  const mahasiswaIds = rows.map((row) => row.id);
  const semesterRows = mahasiswaIds.length
    ? await NilaiMahasiswa.findAll({
        attributes: ['mahasiswaId', 'semester'],
        where: { mahasiswaId: { [Op.in]: mahasiswaIds } },
        group: ['mahasiswaId', 'semester'],
        order: [['semester', 'ASC']],
        raw: true,
      })
    : [];
  const semesterMap = new Map();
  semesterRows.forEach((row) => {
    const list = semesterMap.get(row.mahasiswaId) ?? [];
    list.push(row.semester);
    semesterMap.set(row.mahasiswaId, list);
  });

  const data = rows.map((m) => ({
    id: m.id,
    nim: m.nim,
    namaLengkap: m.namaLengkap,
    kelas: kelasLabel(m),
    semesterOptions: semesterMap.get(m.id) ?? [],
  }));

  return { data, meta: getPagingMeta(count, page, limit) };
};

const getKhsData = async (mahasiswaId, semester) => {
  const mahasiswa = await Mahasiswa.findByPk(mahasiswaId, {
    include: [
      { model: GolonganKelas, as: 'golonganKelas' },
      { model: Jurusan, as: 'jurusan' },
    ],
  });
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa not found');

  const nilaiList = await NilaiMahasiswa.findAll({
    where: { mahasiswaId, semester: Number(semester) },
    order: [['kodeMataKuliah', 'ASC']],
  });

  const nilai = nilaiList.map((n) => {
    const bobot = GRADE_BOBOT[n.grade] ?? 0;
    return {
      kodeMataKuliah: n.kodeMataKuliah,
      namaMataKuliah: n.namaMataKuliah,
      sks: n.sks,
      grade: n.grade,
      bobot,
      mutu: Math.round(bobot * n.sks * 100) / 100,
    };
  });

  const totalSks = nilai.reduce((sum, n) => sum + n.sks, 0);
  const totalMutu = nilai.reduce((sum, n) => sum + n.mutu, 0);
  const ipk = totalSks > 0 ? Math.round((totalMutu / totalSks) * 100) / 100 : 0;

  return {
    mahasiswa: {
      id: mahasiswa.id,
      nim: mahasiswa.nim,
      namaLengkap: mahasiswa.namaLengkap,
    },
    jurusan: mahasiswa.jurusan
      ? { namaJurusan: mahasiswa.jurusan.namaJurusan, jenjangPendidikan: mahasiswa.jurusan.jenjangPendidikan }
      : null,
    semester: Number(semester),
    nilai,
    totalSks,
    totalMutu,
    ipk,
  };
};

module.exports = { searchMahasiswa, getKhsData };
