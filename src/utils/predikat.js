/**
 * Predikat kelulusan sesuai Pedoman Akademik Poltek Bhani Bab II.K.2.f:
 *   IPK 2,75 - 3,00  -> Memuaskan
 *   IPK 3,01 - 3,50  -> Sangat Memuaskan
 *   IPK > 3,51       -> Pujian
 * Di bawah 2,75 dianggap belum memenuhi syarat kelulusan minimum (bukan salah satu predikat).
 */
const predikatKelulusan = (ipk) => {
  if (ipk === null || ipk === undefined || Number.isNaN(ipk)) return null;
  if (ipk > 3.51) return 'Pujian';
  if (ipk >= 3.01) return 'Sangat Memuaskan';
  if (ipk >= 2.75) return 'Memuaskan';
  return null;
};

module.exports = { predikatKelulusan };
