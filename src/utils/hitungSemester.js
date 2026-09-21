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

// Batas masa studi paling lama per jenjang (Pedoman Akademik Poltek Bhani Bab II.A.1 &
// Bab II.G.4 — Diploma III maks 10 semester/5 tahun, Diploma IV maks 14 semester/7 tahun) —
// dipakai untuk MENANDAI mahasiswa yang perlu ditinjau BAAK/prodi saat pergantian periode
// aktif, BUKAN untuk otomatis men-DO. Keputusan status keluar tetap manual (lihat
// views/prodi/mahasiswa/HabisMasaStudiView.vue).
const MAX_SEMESTER_WAJAR_D3 = 10;
const MAX_SEMESTER_WAJAR_D4 = 14;
// Dipertahankan sebagai fallback untuk jenjang yang tidak dikenali/kosong di master Jurusan.
const MAX_SEMESTER_WAJAR = MAX_SEMESTER_WAJAR_D4;

/**
 * Jurusan.jenjangPendidikan adalah teks bebas (mis. "Diploma Tiga", "Diploma Empat") — dicari
 * substring "tiga"/"iii"/"d3" utk D3, sisanya (termasuk kosong/tak dikenali) dianggap D4 supaya
 * aman default ke batas yang lebih longgar daripada salah menandai mahasiswa lulus tepat waktu.
 */
const isJenjangD3 = (jenjangPendidikan) => {
  const label = (jenjangPendidikan ?? '').toLowerCase();
  return /(^|[^0-9])tiga([^0-9]|$)|\biii\b|\bd-?3\b/.test(label);
};

const maxSemesterWajarForJenjang = (jenjangPendidikan) =>
  isJenjangD3(jenjangPendidikan) ? MAX_SEMESTER_WAJAR_D3 : MAX_SEMESTER_WAJAR_D4;

// Masa studi NORMAL (bukan batas paling lama) — Pedoman Bab II.A.1: D3 ditempuh 6 semester,
// D4 ditempuh 8 semester. Dipakai Evaluasi Studi tahap "menjelang akhir masa studi normal".
const masaStudiNormalForJenjang = (jenjangPendidikan) => (isJenjangD3(jenjangPendidikan) ? 6 : 8);

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
  maxSemesterWajarForJenjang,
  masaStudiNormalForJenjang,
  MAX_SEMESTER_WAJAR_D3,
  MAX_SEMESTER_WAJAR_D4,
  MAX_SEMESTER_WAJAR,
};
