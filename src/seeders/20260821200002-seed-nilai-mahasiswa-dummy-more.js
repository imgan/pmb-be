'use strict';

const MATA_KULIAH = [
  { kode: '12207001', nama: 'Pengantar Manajemen dan Bisnis', sks: 3, semester: 1 },
  { kode: '12307001', nama: 'Algoritma', sks: 4, semester: 1 },
  { kode: '12307002', nama: 'Bahasa Pemrograman 1', sks: 3, semester: 1 },
  { kode: '12307003', nama: 'Pengantar Teknologi Informasi', sks: 3, semester: 1 },
  { kode: '12207002', nama: 'Akuntansi Dasar', sks: 4, semester: 2 },
  { kode: '12207003', nama: 'Konsep Sistem Informasi', sks: 4, semester: 2 },
  { kode: '12307004', nama: 'Bahasa Pemrograman 2', sks: 3, semester: 2 },
  { kode: '12307005', nama: 'Sistem Informasi Manajemen', sks: 4, semester: 2 },
  { kode: '12207004', nama: 'Aljabar Linier', sks: 3, semester: 3 },
  { kode: '12207011', nama: 'Pengantar Ekonomi', sks: 2, semester: 3 },
  { kode: '12307006', nama: 'Struktur Data', sks: 4, semester: 3 },
  { kode: '12307007', nama: 'Basis Data', sks: 4, semester: 3 },
  { kode: '12307008', nama: 'Pemrograman Web', sks: 3, semester: 4 },
  { kode: '12307009', nama: 'Jaringan Komputer', sks: 3, semester: 4 },
];

// [partisipatif, tugas, uts, uas] per mata kuliah per mahasiswa, urut sesuai MATA_KULIAH.
const SCORES_BY_NIM = {
  D3ML20260001: [
    [65, 70, 72, 68],
    [80, 85, 82, 88],
    [75, 72, 70, 74],
    [55, 65, 60, 62],
    [70, 68, 72, 70],
    [85, 82, 88, 90],
    [60, 65, 62, 68],
    [90, 88, 92, 94],
    [70, 75, 73, 78],
    [65, 60, 65, 63],
    [80, 78, 82, 85],
    [75, 80, 78, 82],
    [70, 72, 70, 74],
    [85, 88, 90, 92],
  ],
  D4TR20260001: [
    [90, 92, 95, 96],
    [85, 88, 90, 92],
    [95, 94, 98, 97],
    [80, 82, 85, 88],
    [90, 90, 92, 94],
    [85, 86, 88, 90],
    [92, 94, 96, 98],
    [88, 90, 91, 93],
    [80, 82, 84, 86],
    [90, 88, 92, 90],
    [95, 96, 97, 98],
    [85, 87, 89, 91],
    [90, 92, 94, 95],
    [88, 89, 90, 92],
  ],
  D3AR20260001: [
    [50, 55, 52, 58],
    [60, 62, 58, 60],
    [55, 58, 60, 62],
    [45, 50, 48, 52],
    [60, 58, 62, 65],
    [65, 68, 66, 70],
    [50, 55, 53, 58],
    [70, 72, 74, 76],
    [55, 60, 58, 62],
    [50, 52, 55, 58],
    [65, 68, 70, 72],
    [60, 62, 65, 68],
    [55, 58, 60, 62],
    [70, 72, 75, 78],
  ],
  D3AR20260002: [
    [75, 78, 80, 82],
    [70, 72, 74, 76],
    [80, 82, 84, 86],
    [65, 68, 70, 72],
    [78, 80, 82, 84],
    [72, 75, 74, 78],
    [85, 88, 86, 90],
    [68, 70, 72, 74],
    [75, 78, 76, 80],
    [70, 72, 74, 72],
    [80, 82, 85, 88],
    [85, 88, 90, 92],
    [70, 74, 72, 76],
    [78, 80, 82, 85],
  ],
};

const round2 = (n) => Math.round(n * 100) / 100;

const computeNilai = ([partisipatif, tugas, uts, uas]) =>
  round2(partisipatif * 0.1 + tugas * 0.2 + uts * 0.3 + uas * 0.4);

const gradeFor = (nilai) => {
  if (nilai >= 85) return 'A';
  if (nilai >= 70) return 'B';
  if (nilai >= 55) return 'C';
  if (nilai >= 40) return 'D';
  return 'E';
};

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const [mahasiswaRows] = await queryInterface.sequelize.query(
      `SELECT id, nim FROM mahasiswa WHERE nim IN (${Object.keys(SCORES_BY_NIM)
        .map((nim) => `'${nim}'`)
        .join(',')})`
    );
    const mahasiswaIdByNim = Object.fromEntries(mahasiswaRows.map((row) => [row.nim, row.id]));

    const rows = [];
    Object.entries(SCORES_BY_NIM).forEach(([nim, scores]) => {
      const mahasiswaId = mahasiswaIdByNim[nim];
      if (!mahasiswaId) return;
      scores.forEach((score, index) => {
        const mk = MATA_KULIAH[index];
        const [partisipatif, tugas, uts, uas] = score;
        const nilai = computeNilai(score);
        rows.push({
          mahasiswa_id: mahasiswaId,
          kode_mata_kuliah: mk.kode,
          nama_mata_kuliah: mk.nama,
          sks: mk.sks,
          semester: mk.semester,
          partisipatif,
          proyek: 0,
          quiz: 0,
          tugas,
          uts,
          uas,
          nilai,
          grade: gradeFor(nilai),
          created_at: now,
          updated_at: now,
        });
      });
    });

    if (rows.length) {
      await queryInterface.bulkInsert('nilai_mahasiswa', rows);
    }
  },
  down: async (queryInterface) => {
    const [mahasiswaRows] = await queryInterface.sequelize.query(
      `SELECT id FROM mahasiswa WHERE nim IN (${Object.keys(SCORES_BY_NIM)
        .map((nim) => `'${nim}'`)
        .join(',')})`
    );
    const ids = mahasiswaRows.map((row) => row.id);
    if (ids.length) {
      await queryInterface.bulkDelete('nilai_mahasiswa', { mahasiswa_id: ids });
    }
  },
};
