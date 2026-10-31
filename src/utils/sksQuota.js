const { NilaiMahasiswa, JadwalKuliah } = require('../models');
const ApiError = require('./ApiError');
const { GRADE_BOBOT } = require('./gradeScale');

// Aturan beban maksimal SKS per semester berdasarkan IP semester sebelumnya
// (Pedoman Akademik Poltek Bhani Bab II.C.1.d — "Beban Studi dalam Semester"):
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

// Pedoman: "Khusus semester 1 dan 2, beban studi ditentukan oleh program studi
// masing-masing dan tidak melebihi 20 sks" — berlaku flat, TIDAK mengikuti bracket IP di atas
// (mahasiswa semester 1 belum punya riwayat nilai sama sekali untuk dihitung bracketnya).
const MAX_SKS_SEMESTER_AWAL = 20;
const SEMESTER_AWAL_BATAS = 2;

/**
 * Mahasiswa yang belum punya riwayat nilai semester sebelumnya (mis. semester 1, atau
 * belum ada nilai tercatat) tidak dikenai batas bracket IP — return null artinya "tidak
 * dibatasi bracket", tapi tetap bisa kena batas flat semester awal (lihat maxSksForSemester).
 */
const maxSksByIp = (ip) => {
  if (ip === null || ip === undefined || Number.isNaN(ip)) return null;
  const bracket = MAX_SKS_BRACKETS.find((b) => ip >= b.min);
  return bracket ? bracket.max : null;
};

// Kebijakan kampus: batas SKS berdasarkan IP (bracket di atas) TIDAK dipakai lagi — semester 3+
// selalu boleh sampai batas tertinggi 24 SKS, berapa pun IP semester sebelumnya. maxSksByIp tetap
// diekspor sebagai referensi pedoman.
const MAX_SKS_SEMESTER_LANJUT = 24;

/** Semester 1-2: flat 20 sks; semester 3+: flat 24 sks (tanpa melihat IP). */
const maxSksForSemester = (semester) =>
  Number(semester) <= SEMESTER_AWAL_BATAS ? MAX_SKS_SEMESTER_AWAL : MAX_SKS_SEMESTER_LANJUT;

const getIpSemesterSebelumnya = async (mahasiswaId, semester) => {
  const semesterSebelumnya = Number(semester) - 1;
  if (!semesterSebelumnya || semesterSebelumnya < 1) return null;

  const nilaiList = await NilaiMahasiswa.findAll({ where: { mahasiswaId, semester: semesterSebelumnya } });
  if (!nilaiList.length) return null;

  const totalSks = nilaiList.reduce((sum, n) => sum + n.sks, 0);
  const totalMutu = nilaiList.reduce((sum, n) => sum + (GRADE_BOBOT[n.grade] ?? 0) * n.sks, 0);
  return totalSks > 0 ? Math.round((totalMutu / totalSks) * 100) / 100 : null;
};

const sumSksJadwal = async (jadwalKuliahIds) => {
  if (!jadwalKuliahIds?.length) return 0;
  const rows = await JadwalKuliah.findAll({ where: { id: jadwalKuliahIds } });
  return rows.reduce((sum, j) => sum + (j.sks ?? 0), 0);
};

/**
 * Lempar ApiError kalau total SKS yang dipilih melebihi kuota: semester 1-2 maksimal 20 sks,
 * semester 3+ maksimal 24 sks (tidak lagi dibatasi IP semester sebelumnya).
 */
const assertSksQuota = async (mahasiswaId, semester, jadwalKuliahIds) => {
  const maxSks = maxSksForSemester(semester);
  const totalSks = await sumSksJadwal(jadwalKuliahIds);
  if (totalSks > maxSks) {
    const alasan = Number(semester) <= SEMESTER_AWAL_BATAS ? 'batas semester 1-2' : 'batas semester 3 ke atas';
    throw new ApiError(400, `Total SKS yang dipilih (${totalSks}) melebihi batas maksimal ${maxSks} SKS (${alasan})`);
  }
};

module.exports = { maxSksByIp, maxSksForSemester, getIpSemesterSebelumnya, sumSksJadwal, assertSksQuota };
