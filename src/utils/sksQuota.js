const { NilaiMahasiswa, JadwalKuliah } = require('../models');
const ApiError = require('./ApiError');

const GRADE_MUTU = { A: 4, B: 3, C: 2, D: 1, E: 0 };

// Aturan beban maksimal SKS per semester berdasarkan IP semester sebelumnya
// (kebijakan akademik standar):
//   IP >= 3.00        -> maksimal 24 SKS
//   IP 2.50 - 2.99     -> maksimal 21 SKS
//   IP 2.00 - 2.49     -> maksimal 18 SKS
//   IP < 2.00          -> maksimal 15 SKS
const MAX_SKS_BRACKETS = [
  { min: 3.0, max: 24 },
  { min: 2.5, max: 21 },
  { min: 2.0, max: 18 },
  { min: 0, max: 15 },
];

/**
 * Mahasiswa yang belum punya riwayat nilai semester sebelumnya (mis. semester 1, atau
 * belum ada nilai tercatat) tidak dikenai batas — return null artinya "tidak dibatasi".
 */
const maxSksByIp = (ip) => {
  if (ip === null || ip === undefined || Number.isNaN(ip)) return null;
  const bracket = MAX_SKS_BRACKETS.find((b) => ip >= b.min);
  return bracket ? bracket.max : null;
};

const getIpSemesterSebelumnya = async (mahasiswaId, semester) => {
  const semesterSebelumnya = Number(semester) - 1;
  if (!semesterSebelumnya || semesterSebelumnya < 1) return null;

  const nilaiList = await NilaiMahasiswa.findAll({ where: { mahasiswaId, semester: semesterSebelumnya } });
  if (!nilaiList.length) return null;

  const totalSks = nilaiList.reduce((sum, n) => sum + n.sks, 0);
  const totalMutu = nilaiList.reduce((sum, n) => sum + (GRADE_MUTU[n.grade] ?? 0) * n.sks, 0);
  return totalSks > 0 ? Math.round((totalMutu / totalSks) * 100) / 100 : null;
};

const sumSksJadwal = async (jadwalKuliahIds) => {
  if (!jadwalKuliahIds?.length) return 0;
  const rows = await JadwalKuliah.findAll({ where: { id: jadwalKuliahIds } });
  return rows.reduce((sum, j) => sum + (j.sks ?? 0), 0);
};

/**
 * Lempar ApiError kalau total SKS yang dipilih melebihi kuota berdasarkan IP semester
 * sebelumnya. Tidak melakukan apa-apa kalau mahasiswa belum punya riwayat nilai (semester 1
 * atau data nilai belum ada) — dianggap belum bisa dihitung, jadi tidak dibatasi.
 */
const assertSksQuota = async (mahasiswaId, semester, jadwalKuliahIds) => {
  const ip = await getIpSemesterSebelumnya(mahasiswaId, semester);
  const maxSks = maxSksByIp(ip);
  if (maxSks === null) return;

  const totalSks = await sumSksJadwal(jadwalKuliahIds);
  if (totalSks > maxSks) {
    throw new ApiError(
      400,
      `Total SKS yang dipilih (${totalSks}) melebihi batas maksimal ${maxSks} SKS (berdasarkan IP semester sebelumnya ${ip.toFixed(2)})`
    );
  }
};

module.exports = { maxSksByIp, getIpSemesterSebelumnya, sumSksJadwal, assertSksQuota };
