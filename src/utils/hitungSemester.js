/**
 * Hitung semester berjalan mahasiswa secara otomatis dari periode masuk & periode sekarang,
 * mengikuti rumus akademik standar:
 *
 *   periode = tahun * 10 + kodeSemester   (1 = Ganjil, 2 = Genap), mis. 20231 = Ganjil 2023/2024
 *   urutan(periode) = tahun * 2 + kodeSemester
 *   semesterBerjalan = urutan(periodeSekarang) - urutan(periodeMasuk)
 *
 *   Mahasiswa baru   : semester = semesterBerjalan + 1 - jumlahSemesterCuti
 *   Mahasiswa transfer: semester = semesterDiakui + semesterBerjalan - jumlahSemesterCuti
 *
 * `semesterDiakui` (titik awal semester saat transfer diterima, hasil SK penyetaraan SKS) dan
 * `jumlahSemesterCuti` SELALU input manual dari akademik/prodi, bukan hasil kalkulasi — lihat
 * kolom Mahasiswa.semesterDiakui / Mahasiswa.jumlahSemesterCuti.
 */

// Batas normal masa studi S1 (8 tahun / 16 semester per Dikti, dengan buffer 2 semester
// evaluasi) — dipakai untuk MENANDAI mahasiswa yang perlu ditinjau BAAK/prodi saat pergantian
// periode aktif, BUKAN untuk otomatis men-DO. Keputusan status keluar tetap manual
// (lihat views/prodi/mahasiswa/HabisMasaStudiView.vue).
const MAX_SEMESTER_WAJAR = 14;

const kodeSemester = (jenisSemester) => (jenisSemester === 'GENAP' ? 2 : 1);

const periodeKeUrutan = (tahun, jenisSemester) => tahun * 2 + kodeSemester(jenisSemester);

const isMahasiswaTransfer = (statusMasuk) => !!statusMasuk && statusMasuk.startsWith('TRANSFER');

/**
 * @param {number} tahunMasuk
 * @param {'GANJIL'|'GENAP'} jenisSemesterMasuk
 * @param {number} tahunSekarang
 * @param {'GANJIL'|'GENAP'} jenisSemesterSekarang
 * @param {string} statusMasuk - Mahasiswa.statusMasuk ('BARU' atau salah satu TRANSFER_*)
 * @param {number|null} semesterDiakui - wajib diisi (manual) untuk mahasiswa transfer
 * @param {number} jumlahSemesterCuti
 */
const hitungSemesterBerjalan = ({
  tahunMasuk,
  jenisSemesterMasuk,
  tahunSekarang,
  jenisSemesterSekarang,
  statusMasuk,
  semesterDiakui,
  jumlahSemesterCuti = 0,
}) => {
  const urutanMasuk = periodeKeUrutan(tahunMasuk, jenisSemesterMasuk);
  const urutanSekarang = periodeKeUrutan(tahunSekarang, jenisSemesterSekarang);
  const semesterBerjalan = urutanSekarang - urutanMasuk;

  const semester = isMahasiswaTransfer(statusMasuk)
    ? (semesterDiakui || 1) + semesterBerjalan - jumlahSemesterCuti
    : semesterBerjalan + 1 - jumlahSemesterCuti;

  return Math.max(semester, 1);
};

/**
 * Titik masuk tunggal untuk "semester mahasiswa sekarang" — SELALU panggil ini, jangan panggil
 * hitungSemesterBerjalan langsung, supaya semesterOverride (koreksi manual kasus khusus per
 * mahasiswa, lihat kolom Mahasiswa.semesterOverride) konsisten dihormati di semua tempat
 * (portal mahasiswa, laporan aktivasi tahun ajaran, dll).
 *
 * @param {object} mahasiswa - butuh: tahunMasuk, tahunAjaran?.jenisSemester, statusMasuk,
 *   semesterDiakui, jumlahSemesterCuti, semesterOverride
 * @param {object} tahunAjaranAktif - butuh: tahunMulai, jenisSemester
 */
const resolveSemesterMahasiswa = (mahasiswa, tahunAjaranAktif) => {
  if (mahasiswa.semesterOverride != null) return mahasiswa.semesterOverride;

  return hitungSemesterBerjalan({
    tahunMasuk: mahasiswa.tahunMasuk,
    jenisSemesterMasuk: mahasiswa.tahunAjaran?.jenisSemester ?? 'GANJIL',
    tahunSekarang: tahunAjaranAktif.tahunMulai,
    jenisSemesterSekarang: tahunAjaranAktif.jenisSemester,
    statusMasuk: mahasiswa.statusMasuk,
    semesterDiakui: mahasiswa.semesterDiakui,
    jumlahSemesterCuti: mahasiswa.jumlahSemesterCuti,
  });
};

module.exports = {
  periodeKeUrutan,
  isMahasiswaTransfer,
  hitungSemesterBerjalan,
  resolveSemesterMahasiswa,
  MAX_SEMESTER_WAJAR,
};
