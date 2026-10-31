/**
 * Label tahun ajaran lengkap dengan semesternya, mis. "2026/2027 GANJIL". `jenisSemester` bisa
 * dioper terpisah untuk data yang menyimpan semester sendiri (mis. jadwal sidang).
 */
const formatTahunAjaran = (tahunAjaran, jenisSemester = tahunAjaran?.jenisSemester) => {
  if (!tahunAjaran?.nama) return null;
  return jenisSemester ? `${tahunAjaran.nama} ${jenisSemester}` : tahunAjaran.nama;
};

/** Tahun akademik dari tanggal: Juli–Desember = GANJIL, Januari–Juni = GENAP. */
const tahunAkademikFromDate = (value) => {
  const d = value ? new Date(value) : new Date();
  const year = d.getFullYear();
  return d.getMonth() >= 6 ? `${year}/${year + 1} GANJIL` : `${year - 1}/${year} GENAP`;
};

module.exports = { formatTahunAjaran, tahunAkademikFromDate };
