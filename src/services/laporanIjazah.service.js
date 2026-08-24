const { Op, fn, col, literal } = require('sequelize');
const { Yudisium, Mahasiswa, MahasiswaBiodata, Jurusan, Dosen, NilaiMahasiswa, GolonganKelas } = require('../models');
const ApiError = require('../utils/ApiError');
const { getPagination, getPagingMeta } = require('../utils/pagination');

const GRADE_MUTU = { A: 4, B: 3, C: 2, D: 1, E: 0 };

const getRingkasanNilai = async (mahasiswaId) => {
  const nilaiList = await NilaiMahasiswa.findAll({ where: { mahasiswaId }, raw: true });
  const totalSks = nilaiList.reduce((sum, n) => sum + n.sks, 0);
  const totalBobot = nilaiList.reduce((sum, n) => sum + (GRADE_MUTU[n.grade] ?? 0) * n.sks, 0);
  const ipk = totalSks > 0 ? Math.round((totalBobot / totalSks) * 100) / 100 : 0;
  return { nilaiList, totalSks, totalBobot, ipk };
};

const listGraduates = async (query) => {
  const { page, limit, offset } = getPagination(query);

  const mahasiswaWhere = {};
  if (query.jurusanId) mahasiswaWhere.jurusanId = query.jurusanId;
  if (query.search) {
    mahasiswaWhere[Op.or] = [
      { nim: { [Op.like]: `%${query.search}%` } },
      { namaLengkap: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const where = { tanggalYudisium: { [Op.ne]: null } };
  if (query.tahunLulus) {
    where[Op.and] = [literal(`YEAR(tanggal_yudisium) = ${Number(query.tahunLulus)}`)];
  }

  const { rows, count } = await Yudisium.findAndCountAll({
    where,
    include: [
      {
        model: Mahasiswa,
        as: 'mahasiswa',
        where: Object.keys(mahasiswaWhere).length ? mahasiswaWhere : undefined,
        include: [
          { model: Jurusan, as: 'jurusan' },
          { model: MahasiswaBiodata, as: 'biodata' },
        ],
      },
    ],
    limit,
    offset,
    order: [['tanggalYudisium', 'DESC']],
    subQuery: false,
    distinct: true,
  });

  const data = await Promise.all(
    rows.map(async (row) => {
      const { totalSks, ipk } = await getRingkasanNilai(row.mahasiswaId);
      return {
        id: row.id,
        mahasiswaId: row.mahasiswaId,
        nim: row.mahasiswa.nim,
        namaLengkap: row.mahasiswa.namaLengkap,
        tempatLahir: row.mahasiswa.biodata?.tempatLahir ?? null,
        tanggalLahir: row.mahasiswa.biodata?.tanggalLahir ?? null,
        namaJurusan: row.mahasiswa.jurusan?.namaJurusan ?? null,
        tahunMasuk: row.mahasiswa.tahunMasuk ?? null,
        statusMasuk: row.mahasiswa.statusMasuk ?? null,
        totalSks,
        ipk,
        noSk: row.noSk,
        tanggalYudisium: row.tanggalYudisium,
      };
    })
  );

  return { data, meta: getPagingMeta(count, page, limit) };
};

const getTahunLulusOptions = async () => {
  const rows = await Yudisium.findAll({
    attributes: [[fn('DISTINCT', fn('YEAR', col('tanggal_yudisium'))), 'tahun']],
    where: { tanggalYudisium: { [Op.ne]: null } },
    order: [[literal('tahun'), 'DESC']],
    raw: true,
  });
  return rows.map((row) => row.tahun).filter((tahun) => tahun !== null);
};

const getCetakData = async (mahasiswaId) => {
  const mahasiswa = await Mahasiswa.findByPk(mahasiswaId, {
    include: [
      { model: Jurusan, as: 'jurusan' },
      { model: GolonganKelas, as: 'golonganKelas' },
      { model: MahasiswaBiodata, as: 'biodata' },
    ],
  });
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa not found');

  const yudisium = await Yudisium.findOne({
    where: { mahasiswaId },
    include: [
      { model: Dosen, as: 'pembimbing1' },
      { model: Dosen, as: 'pembimbing2' },
    ],
  });
  if (!yudisium || !yudisium.tanggalYudisium) {
    throw new ApiError(400, 'Mahasiswa ini belum memiliki data yudisium (belum dinyatakan lulus)');
  }

  const { nilaiList, totalSks, totalBobot, ipk } = await getRingkasanNilai(mahasiswaId);

  return {
    mahasiswa: {
      id: mahasiswa.id,
      nim: mahasiswa.nim,
      namaLengkap: mahasiswa.namaLengkap,
      tempatLahir: mahasiswa.biodata?.tempatLahir ?? null,
      tanggalLahir: mahasiswa.biodata?.tanggalLahir ?? null,
      noKtp: mahasiswa.biodata?.noKtp ?? null,
    },
    jurusan: mahasiswa.jurusan
      ? {
          namaJurusan: mahasiswa.jurusan.namaJurusan,
          jenjangPendidikan: mahasiswa.jurusan.jenjangPendidikan,
          gelarSingkat: mahasiswa.jurusan.gelarSingkat,
          gelarLengkap: mahasiswa.jurusan.gelarLengkap,
          namaFakultas: mahasiswa.jurusan.namaFakultas,
        }
      : null,
    yudisium: {
      noSk: yudisium.noSk,
      tanggalSk: yudisium.tanggalSk,
      tanggalYudisium: yudisium.tanggalYudisium,
      pin: yudisium.pin,
      judul: yudisium.judul,
      pembimbing1: yudisium.pembimbing1?.namaLengkap ?? null,
      pembimbing2: yudisium.pembimbing2?.namaLengkap ?? null,
    },
    nilai: nilaiList
      .slice()
      .sort((a, b) => a.semester - b.semester || a.kodeMataKuliah.localeCompare(b.kodeMataKuliah))
      .map((n) => ({
        kodeMataKuliah: n.kodeMataKuliah,
        namaMataKuliah: n.namaMataKuliah,
        sks: n.sks,
        semester: n.semester,
        mutu: GRADE_MUTU[n.grade] ?? 0,
        grade: n.grade,
      })),
    totalSks,
    totalBobot,
    ipk,
  };
};

module.exports = { listGraduates, getTahunLulusOptions, getCetakData };
