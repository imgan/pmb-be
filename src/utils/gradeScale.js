/**
 * Skala nilai huruf & konversi nilai angka -> huruf (9 tingkat):
 *
 *   Huruf  Indeks  Rentang
 *   A      4.00    85 - 100
 *   A-     3.70    80 - 84
 *   B+     3.30    75 - 79
 *   B      3.00    70 - 74
 *   B-     2.70    65 - 69
 *   C+     2.30    60 - 64
 *   C      2.00    55 - 59
 *   D      1.00    45 - 54
 *   E      0.00     0 - 44
 *
 * Dipakai bersama oleh seluruh perhitungan IPS/IPK, kuota SKS KRS, dan KHS supaya bobotnya
 * konsisten di satu tempat. Batas memakai nilai minimum, jadi nilai pecahan di antara dua
 * rentang (mis. 84.5) masuk ke huruf di bawahnya (A-).
 */
const GRADE_BOBOT = {
  A: 4.0,
  'A-': 3.7,
  'B+': 3.3,
  B: 3.0,
  'B-': 2.7,
  'C+': 2.3,
  C: 2.0,
  D: 1.0,
  E: 0.0,
};

const GRADE_RANGES = [
  { min: 85, grade: 'A' },
  { min: 80, grade: 'A-' },
  { min: 75, grade: 'B+' },
  { min: 70, grade: 'B' },
  { min: 65, grade: 'B-' },
  { min: 60, grade: 'C+' },
  { min: 55, grade: 'C' },
  { min: 45, grade: 'D' },
  { min: 0, grade: 'E' },
];

const gradeFor = (nilai) => {
  const range = GRADE_RANGES.find((r) => nilai >= r.min);
  return range ? range.grade : 'E';
};

module.exports = { GRADE_BOBOT, GRADE_RANGES, gradeFor };
