const router = require('express').Router();
const mahasiswaAuthController = require('../controllers/mahasiswaAuth.controller');
const mahasiswaPortalController = require('../controllers/mahasiswaPortal.controller');
const authenticateMahasiswa = require('../middlewares/mahasiswaAuth.middleware');
const validate = require('../middlewares/validate.middleware');
const { loginMahasiswa, updateProfile, changePassword } = require('../validations/mahasiswaAuth.validation');
const { saveKrsDraft, createSuratRequest, submitEdom } = require('../validations/mahasiswaPortal.validation');
const { saveBiodataSendiri } = require('../validations/mahasiswaBiodata.validation');
const { createTiket } = require('../validations/tiketMahasiswa.validation');
const tiketController = require('../controllers/tiketMahasiswa.controller');
const pengajuanTaController = require('../controllers/pengajuanTa.controller');
const bimbinganTaController = require('../controllers/bimbinganTa.controller');
const mahasiswaSidangController = require('../controllers/mahasiswaSidang.controller');
const { ajukanTa } = require('../validations/pengajuanTa.validation');
const mahasiswaKkpController = require('../controllers/mahasiswaKkp.controller');
const { saveKkp } = require('../validations/mahasiswaKkp.validation');
const pengajuanCutiController = require('../controllers/pengajuanCuti.controller');
const { ajukanCuti } = require('../validations/pengajuanCuti.validation');

/**
 * @swagger
 * tags:
 *   name: MahasiswaPortal
 *   description: Portal self-service Mahasiswa (login mandiri, terpisah dari sistem User/Role admin)
 */

/**
 * @swagger
 * /mahasiswa-portal/login:
 *   post:
 *     summary: Login mahasiswa menggunakan NIM atau email + password
 *     tags: [MahasiswaPortal]
 *     responses:
 *       200:
 *         description: Login berhasil
 *       401:
 *         description: NIM/email atau password salah
 */
router.post('/login', validate(loginMahasiswa), mahasiswaAuthController.login);

router.use(authenticateMahasiswa);

/**
 * @swagger
 * /mahasiswa-portal/me:
 *   get:
 *     summary: Get profil mahasiswa yang sedang login
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Profil mahasiswa
 */
router.get('/me', mahasiswaAuthController.me);

/**
 * @swagger
 * /mahasiswa-portal/profile:
 *   put:
 *     summary: Ubah foto profil mahasiswa yang sedang login
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Profil berhasil diperbarui
 */
router.put('/profile', validate(updateProfile), mahasiswaAuthController.updateProfile);

/**
 * @swagger
 * /mahasiswa-portal/change-password:
 *   put:
 *     summary: Ubah password mahasiswa yang sedang login
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Password berhasil diubah
 *       400:
 *         description: Password lama salah
 */
router.put('/change-password', validate(changePassword), mahasiswaAuthController.changePassword);

/**
 * @swagger
 * /mahasiswa-portal/biodata:
 *   get:
 *     summary: Get biodata lengkap mahasiswa yang sedang login (null jika belum diisi)
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Biodata mahasiswa
 *   put:
 *     summary: Simpan biodata lengkap milik sendiri. Field kelas, jalur/jenis pendaftaran, tgl masuk
 *       kuliah, mulai semester, program studi, status belajar/kuliah/dikti diabaikan (hanya BAAK/Prodi)
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Biodata berhasil disimpan
 */
router.get('/biodata', mahasiswaPortalController.getBiodata);
router.put('/biodata', validate(saveBiodataSendiri), mahasiswaPortalController.saveBiodata);

/**
 * @swagger
 * /mahasiswa-portal/tahun-ajaran-aktif:
 *   get:
 *     summary: Get tahun ajaran yang sedang aktif
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Tahun ajaran aktif
 */
router.get('/tahun-ajaran-aktif', mahasiswaPortalController.tahunAjaranAktif);

/**
 * @swagger
 * /mahasiswa-portal/akses-akademik:
 *   get:
 *     summary: Status batas tagihan mahasiswa login untuk isi KRS & lihat nilai (dari konfigurasi Keuangan per prodi)
 *     tags: [MahasiswaPortal]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: totalTunggakan + status krs/nilai (aktif, batas, diizinkan, pesan)
 */
router.get('/akses-akademik', mahasiswaPortalController.aksesAkademik);

/**
 * @swagger
 * /mahasiswa-portal/jadwal-tersedia:
 *   get:
 *     summary: List jadwal kuliah aktif yang tersedia untuk diambil pada KRS
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List jadwal kuliah
 */
router.get('/jadwal-tersedia', mahasiswaPortalController.listJadwalTersedia);

/**
 * @swagger
 * /mahasiswa-portal/jadwal/{jadwalKuliahId}/realisasi:
 *   get:
 *     summary: Realisasi dosen mengajar per pertemuan + status presensi mahasiswa login
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Detail realisasi jadwal
 * /mahasiswa-portal/jadwal/{jadwalKuliahId}/realisasi/{kehadiranDosenId}/hadir:
 *   post:
 *     summary: Presensi mandiri (hadir) untuk pertemuan hari ini
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Presensi tercatat
 */
router.get('/jadwal/:jadwalKuliahId/realisasi', mahasiswaPortalController.realisasiJadwal);
router.post('/jadwal/:jadwalKuliahId/realisasi/:kehadiranDosenId/hadir', mahasiswaPortalController.presensiMandiri);

/**
 * @swagger
 * /mahasiswa-portal/semester-berjalan:
 *   get:
 *     summary: Semester berjalan mahasiswa, dihitung otomatis dari periode masuk vs periode
 *       sekarang (tidak bisa dipilih manual — beda rumus untuk mahasiswa baru vs transfer)
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Semester berjalan
 */
router.get('/semester-berjalan', mahasiswaPortalController.semesterBerjalan);

/**
 * @swagger
 * /mahasiswa-portal/krs/kuota:
 *   get:
 *     summary: Get kuota maksimal SKS untuk semester tertentu, berdasarkan IP semester sebelumnya
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Kuota SKS (null maxSks berarti belum ada riwayat nilai / tidak dibatasi)
 */
router.get('/krs/kuota', mahasiswaPortalController.kuotaSks);
// Periode pengisian KRS mengikuti Tahun FRS aktif (Modul Admin › Tahun › FRS).
router.get('/krs/periode', mahasiswaPortalController.periodeKrs);

/**
 * @swagger
 * /mahasiswa-portal/krs:
 *   get:
 *     summary: List KRS milik mahasiswa yang sedang login
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List KRS
 *   put:
 *     summary: Simpan (buat/ubah) draft KRS untuk satu tahun ajaran & semester
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: KRS draft berhasil disimpan
 */
router.get('/krs', mahasiswaPortalController.listKrs);
router.put('/krs', validate(saveKrsDraft), mahasiswaPortalController.saveKrsDraft);

/**
 * @swagger
 * /mahasiswa-portal/krs/{id}/ajukan:
 *   post:
 *     summary: Ajukan KRS (ubah status dari DRAFT menjadi DIAJUKAN)
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: KRS berhasil diajukan
 */
router.post('/krs/:id/ajukan', mahasiswaPortalController.ajukanKrs);

/**
 * @swagger
 * /mahasiswa-portal/nilai:
 *   get:
 *     summary: List nilai (KHS) milik mahasiswa yang sedang login, dikelompokkan per semester
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List nilai per semester
 */
router.get('/nilai', mahasiswaPortalController.listNilai);

/**
 * @swagger
 * /mahasiswa-portal/nilai/khs-pdf:
 *   get:
 *     summary: Cetak KHS (PDF) milik mahasiswa yang sedang login untuk semester tertentu
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: semester
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: File PDF KHS
 *       400:
 *         description: Semester wajib dipilih
 *       404:
 *         description: Belum ada nilai pada semester ini
 */
router.get('/nilai/khs-pdf', mahasiswaPortalController.khsPdf);

/**
 * @swagger
 * /mahasiswa-portal/transkrip:
 *   get:
 *     summary: Get transkrip nilai lengkap milik mahasiswa yang sedang login
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Transkrip nilai
 */
router.get('/transkrip', mahasiswaPortalController.getTranskrip);

/**
 * @swagger
 * /mahasiswa-portal/mengulang:
 *   get:
 *     summary: Mata kuliah yang belum selesai / harus diulang (nilai diakui di bawah C)
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Daftar mata kuliah mengulang
 */
router.get('/mengulang', mahasiswaPortalController.getMatakuliahMengulang);

/**
 * @swagger
 * /mahasiswa-portal/pengumuman:
 *   get:
 *     summary: Pengumuman BAAK yang sedang tayang untuk mahasiswa yang login (semua prodi / prodinya)
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Daftar pengumuman
 */
router.get('/pengumuman', mahasiswaPortalController.listPengumuman);

/**
 * @swagger
 * /mahasiswa-portal/data-kampus/kurikulum:
 *   get:
 *     summary: Kurikulum prodi mahasiswa per semester beserta status lulus tiap MK (query tahunKurikulum opsional)
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 * /mahasiswa-portal/data-kampus/kehadiran:
 *   get:
 *     summary: Rekap kehadiran per mata kuliah di KRS satu tahun akademik (query tahunAjaranId opsional)
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 * /mahasiswa-portal/data-kampus/bimbingan:
 *   get:
 *     summary: Kartu bimbingan TA/Skripsi (catatan konsultasi dari dosen pembimbing); null bila pengajuan TA belum disetujui
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 * /mahasiswa-portal/data-kampus/dosen:
 *   get:
 *     summary: Informasi dosen aktif (nama, NIDN, tempat/tanggal lahir, kontak, gelar, pendidikan)
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 */
router.get('/data-kampus/dosen', mahasiswaPortalController.getDaftarDosen);
router.get('/data-kampus/kurikulum', mahasiswaPortalController.getKurikulum);
router.get('/data-kampus/kehadiran', mahasiswaPortalController.getRekapKehadiran);
router.get('/data-kampus/bimbingan', bimbinganTaController.kartuMahasiswa);

/**
 * @swagger
 * /mahasiswa-portal/tiket:
 *   get:
 *     summary: Tiket bantuan milik mahasiswa yang login
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *   post:
 *     summary: Ajukan tiket bantuan (jenisKebutuhan, uraian)
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 * /mahasiswa-portal/tiket/{id}:
 *   delete:
 *     summary: Batalkan tiket yang belum ditanggapi petugas
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 */
router.get('/tiket', tiketController.listMilikSendiri);
router.post('/tiket', validate(createTiket), tiketController.ajukan);
router.delete('/tiket/:id', tiketController.batalkan);

/**
 * @swagger
 * /mahasiswa-portal/tugas-akhir:
 *   get:
 *     summary: Form pengajuan TA/Skripsi (periode aktif, pilihan pembimbing & tempat KKP) + riwayat pengajuan
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *   post:
 *     summary: Ajukan / ubah pengajuan TA/Skripsi pada periode yang sedang dibuka
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 * /mahasiswa-portal/tugas-akhir/{id}:
 *   delete:
 *     summary: Batalkan pengajuan yang belum diverifikasi prodi
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 */
router.get('/tugas-akhir', pengajuanTaController.formMahasiswa);
router.post('/tugas-akhir', validate(ajukanTa), pengajuanTaController.ajukanMahasiswa);
router.delete('/tugas-akhir/:id', pengajuanTaController.batalkanMahasiswa);

/**
 * @swagger
 * /mahasiswa-portal/sidang:
 *   get:
 *     summary: Data sidang TA/Skripsi (syarat, pendaftaran, jadwal tersedia, nilai & lembar koreksi)
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *   post:
 *     summary: Daftar sidang / pindah jadwal (jadwalSidangId)
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *   delete:
 *     summary: Batalkan pendaftaran sidang (selama belum dinilai)
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 */
router.get('/sidang', mahasiswaSidangController.get);
router.post('/sidang', validate(mahasiswaSidangController.daftarSidangSchema), mahasiswaSidangController.daftar);
router.delete('/sidang', mahasiswaSidangController.batal);

/**
 * @swagger
 * /mahasiswa-portal/edom/pertanyaan:
 *   get:
 *     summary: Pertanyaan & pilihan jawaban angket dosen (EDOM) dari master Prodi
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Pertanyaan (openQuestion = isian bebas) & pilihan jawaban (nilai)
 */
router.get('/edom/pertanyaan', mahasiswaPortalController.listEdomPertanyaan);

/**
 * @swagger
 * /mahasiswa-portal/edom:
 *   get:
 *     summary: Angket dosen tahun akademik aktif — kelas di KRS disetujui, dosen yang dinilai, status isi & kehadiran
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 */
router.get('/edom', mahasiswaPortalController.getAngketDosen);

/**
 * @swagger
 * /mahasiswa-portal/kalender-akademik:
 *   get:
 *     summary: Kalender akademik (hanya lihat) — tahunAjaranId opsional, default tahun akademik aktif
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 */
router.get('/kalender-akademik', mahasiswaPortalController.getKalenderAkademik);

/**
 * @swagger
 * /mahasiswa-portal/edom:
 *   post:
 *     summary: Isi angket dosen (EDOM) untuk satu dosen pengajar pada satu kelas di KRS disetujui (sekali, tidak bisa diubah)
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     responses:
 *       201:
 *         description: EDOM berhasil disimpan
 *       409:
 *         description: EDOM dosen ini sudah pernah diisi
 */
router.post('/edom', validate(submitEdom), mahasiswaPortalController.submitEdom);

/**
 * @swagger
 * /mahasiswa-portal/surat-keterangan:
 *   get:
 *     summary: List pengajuan surat keterangan milik mahasiswa yang sedang login
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List pengajuan surat
 *   post:
 *     summary: Ajukan surat keterangan baru (status awal DIAJUKAN, menunggu diproses BAAK)
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Pengajuan surat berhasil dikirim
 */
/**
 * @swagger
 * /mahasiswa-portal/pengajuan/kkp:
 *   get:
 *     summary: Form pendaftaran Kuliah Kerja Praktek (identitas, tahun ajaran aktif, pilihan pembimbing, pendaftaran yang sudah ada)
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *   put:
 *     summary: Simpan pendaftaran KKP tahun ajaran aktif (bisa diubah selama nilai belum diisi prodi)
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 */
router.get('/pengajuan/kkp', mahasiswaKkpController.getForm);
router.put('/pengajuan/kkp', validate(saveKkp), mahasiswaKkpController.save);

/**
 * @swagger
 * /mahasiswa-portal/pengajuan/cuti:
 *   get:
 *     summary: Form pengajuan cuti (identitas, semester berjalan) + riwayat pengajuan cuti
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *   post:
 *     summary: Ajukan cuti akademik (status DIAJUKAN, menunggu persetujuan prodi)
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 * /mahasiswa-portal/pengajuan/cuti/{id}:
 *   delete:
 *     summary: Batalkan pengajuan cuti yang belum diproses prodi
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 * /mahasiswa-portal/pengajuan/cuti/{id}/pdf:
 *   get:
 *     summary: Cetak formulir pengajuan cuti
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 */
router.get('/pengajuan/cuti', pengajuanCutiController.getForm);
router.post('/pengajuan/cuti', validate(ajukanCuti), pengajuanCutiController.ajukan);
router.delete('/pengajuan/cuti/:id', pengajuanCutiController.batalkan);
router.get('/pengajuan/cuti/:id/pdf', pengajuanCutiController.pdfMahasiswa);

router.get('/surat-keterangan', mahasiswaPortalController.listSuratKeterangan);
router.post('/surat-keterangan', validate(createSuratRequest), mahasiswaPortalController.createSuratKeterangan);

/**
 * @swagger
 * /mahasiswa-portal/surat-keterangan/{id}/pdf:
 *   get:
 *     summary: Cetak PDF surat keterangan yang sudah disetujui BAAK
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: File PDF
 *       400:
 *         description: Surat belum disetujui
 *       404:
 *         description: Pengajuan surat tidak ditemukan
 */
router.get('/surat-keterangan/:id/pdf', mahasiswaPortalController.suratKeteranganPdf);

/**
 * @swagger
 * /mahasiswa-portal/ktm:
 *   get:
 *     summary: Data Kartu Tanda Mahasiswa (KTM) milik mahasiswa yang login (untuk pratinjau)
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Data KTM
 *       403:
 *         description: Mahasiswa tidak aktif
 */
router.get('/ktm', mahasiswaPortalController.getKtm);

/**
 * @swagger
 * /mahasiswa-portal/ktm/pdf:
 *   get:
 *     summary: Cetak KTM (PDF ukuran kartu ID, sisi depan & belakang)
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: File PDF
 *       403:
 *         description: Mahasiswa tidak aktif
 */
router.get('/ktm/pdf', mahasiswaPortalController.ktmPdf);

/**
 * @swagger
 * /mahasiswa-portal/pembayaran:
 *   get:
 *     summary: Riwayat pembayaran kuliah mahasiswa yang login (per semester, beserta sisa tagihan)
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Ringkasan & daftar tagihan semester dengan pembayarannya
 */
router.get('/pembayaran', mahasiswaPortalController.listPembayaran);

/**
 * @swagger
 * /mahasiswa-portal/pembayaran/{id}/kwitansi:
 *   get:
 *     summary: Cetak kwitansi satu pembayaran kuliah (PDF A5) milik mahasiswa yang login
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: File PDF
 *       404:
 *         description: Pembayaran tidak ditemukan / bukan milik mahasiswa ini
 */
router.get('/pembayaran/:id/kwitansi', mahasiswaPortalController.kwitansiPdf);

module.exports = router;
