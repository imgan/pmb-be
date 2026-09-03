const { Op, fn, col, literal } = require('sequelize');
const { Yudisium, Mahasiswa, Jurusan, Krs, NilaiMahasiswa } = require('../models');

const GRADE_MUTU = { A: 4, B: 3, C: 2, D: 1, E: 0 };

const getIpk = async (mahasiswaId) => {
  const nilaiList = await NilaiMahasiswa.findAll({ where: { mahasiswaId }, attributes: ['sks', 'grade'], raw: true });
  const totalSks = nilaiList.reduce((sum, n) => sum + n.sks, 0);
  const totalBobot = nilaiList.reduce((sum, n) => sum + (GRADE_MUTU[n.grade] ?? 0) * n.sks, 0);
  return totalSks > 0 ? Number((totalBobot / totalSks).toFixed(2)) : 0;
};

// "Lama Studi" dihitung dari semester KRS tertinggi yang pernah diambil mahasiswa (mis. KRS
// terakhirnya di semester 8 berarti lama studi 8 semester) — tidak ada kolom lama-studi
// tersendiri di manapun, dan ini konsisten dengan cara semester dihitung di seluruh sistem
// (lihat pmb-be/src/utils/hitungSemester.js).
const getLamaStudiSemester = async (mahasiswaId) => {
  const maxSemester = await Krs.max('semester', { where: { mahasiswaId } });
  return maxSemester ?? null;
};

const listLulusan = async ({ tahun, jurusanId } = {}) => {
  const mahasiswaWhere = {};
  if (jurusanId) mahasiswaWhere.jurusanId = jurusanId;

  const where = { tanggalYudisium: { [Op.ne]: null } };
  if (tahun) {
    where[Op.and] = [literal(`YEAR(tanggal_yudisium) = ${Number(tahun)}`)];
  }

  const rows = await Yudisium.findAll({
    where,
    include: [
      {
        model: Mahasiswa,
        as: 'mahasiswa',
        required: true,
        where: Object.keys(mahasiswaWhere).length ? mahasiswaWhere : undefined,
        include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan'] }],
      },
    ],
    order: [['tanggalYudisium', 'DESC']],
  });

  return Promise.all(
    rows.map(async (row) => {
      const [ipk, lamaStudiSemester] = await Promise.all([
        getIpk(row.mahasiswaId),
        getLamaStudiSemester(row.mahasiswaId),
      ]);
      return {
        tahunLulus: new Date(row.tanggalYudisium).getFullYear(),
        jurusan: row.mahasiswa.jurusan?.namaJurusan ?? '-',
        nim: row.mahasiswa.nim,
        nama: row.mahasiswa.namaLengkap,
        ipk,
        lamaStudiSemester,
      };
    })
  );
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

const getProdiOptions = async () => {
  const rows = await Jurusan.findAll({ attributes: ['id', 'namaJurusan'], order: [['namaJurusan', 'ASC']] });
  return rows.map((r) => ({ id: r.id, namaJurusan: r.namaJurusan }));
};

module.exports = { listLulusan, getTahunLulusOptions, getProdiOptions };
