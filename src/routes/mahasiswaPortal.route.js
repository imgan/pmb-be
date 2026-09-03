const router = require('express').Router();
const mahasiswaAuthController = require('../controllers/mahasiswaAuth.controller');
const mahasiswaPortalController = require('../controllers/mahasiswaPortal.controller');
const authenticateMahasiswa = require('../middlewares/mahasiswaAuth.middleware');
const validate = require('../middlewares/validate.middleware');
const { loginMahasiswa, updateProfile, changePassword } = require('../validations/mahasiswaAuth.validation');
const { saveKrsDraft, createSuratRequest } = require('../validations/mahasiswaPortal.validation');

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

module.exports = router;
