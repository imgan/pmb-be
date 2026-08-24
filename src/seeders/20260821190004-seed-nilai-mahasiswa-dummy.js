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
  D3FR20260001: [
    [70, 78, 85, 74],
    [90, 90, 94, 100],
    [80, 70, 75, 65],
    [40, 85, 100, 95],
    [70, 70, 63, 75],
    [80, 80, 78, 89],
    [70, 90, 94, 100],
    [80, 80, 68, 75],
    [50, 80, 85, 60],
    [80, 67, 67, 70],
    [90, 88, 80, 85],
    [75, 72, 70, 78],
    [85, 90, 88, 92],
    [60, 65, 70, 68],
  ],
  D3FR20260002: [
    [80, 82, 78, 80],
    [70, 75, 80, 77],
    [90, 88, 85, 90],
    [60, 70, 65, 72],
    [85, 80, 82, 88],
    [75, 78, 74, 80],
    [90, 92, 88, 95],
    [65, 68, 70, 66],
    [80, 75, 78, 82],
    [70, 72, 68, 75],
    [85, 80, 83, 86],
    [90, 85, 88, 90],
    [60, 62, 65, 60],
    [75, 78, 80, 82],
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
