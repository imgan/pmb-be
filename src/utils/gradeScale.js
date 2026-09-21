/**
 * Skala nilai huruf & konversi nilai angka -> huruf, mengikuti Pedoman Akademik Poltek Bhani
 * (10 tingkat, termasuk A-/B+/B-/C+/C-). Dipakai bersama oleh seluruh perhitungan IPS/IPK,
 * kuota SKS KRS, dan KHS supaya bobotnya konsisten di satu tempat.
 */
const GRADE_BOBOT = {
  A: 4.0,
  'A-': 3.7,
  'B+': 3.3,
  B: 3.0,
  'B-': 2.7,
  'C+': 2.3,
  C: 2.0,
  'C-': 1.7,
  D: 1.0,
  E: 0.0,
};

const GRADE_RANGES = [
  { min: 90, grade: 'A' },
  { min: 85, grade: 'A-' },
  { min: 80, grade: 'B+' },
  { min: 75, grade: 'B' },
  { min: 70, grade: 'B-' },
  { min: 65, grade: 'C+' },
  { min: 60, grade: 'C' },
  { min: 56, grade: 'C-' },
  { min: 31, grade: 'D' },
  { min: 0, grade: 'E' },
];

const gradeFor = (nilai) => {
  const range = GRADE_RANGES.find((r) => nilai >= r.min);
  return range ? range.grade : 'E';
};

module.exports = { GRADE_BOBOT, gradeFor };
