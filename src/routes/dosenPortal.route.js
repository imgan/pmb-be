const router = require('express').Router();
const dosenAuthController = require('../controllers/dosenAuth.controller');
const dosenPortalController = require('../controllers/dosenPortal.controller');
const authenticateDosen = require('../middlewares/dosenAuth.middleware');
const validate = require('../middlewares/validate.middleware');
const { loginDosen } = require('../validations/dosenAuth.validation');
const { createRealisasiMengajar, savePresensiMahasiswa } = require('../validations/dosenRealisasiMengajar.validation');

/**
 * @swagger
 * tags:
 *   name: DosenPortal
 *   description: Portal self-service Dosen (login mandiri, terpisah dari sistem User/Role admin)
 */

/**
 * @swagger
 * /dosen-portal/login:
 *   post:
 *     summary: Login dosen menggunakan NIDN atau email + password
 *     tags: [DosenPortal]
 *     responses:
 *       200:
 *         description: Login berhasil
 *       401:
 *         description: NIDN/email atau password salah
 */
router.post('/login', validate(loginDosen), dosenAuthController.login);

router.use(authenticateDosen);

/**
 * @swagger
 * /dosen-portal/me:
 *   get:
 *     summary: Get profil dosen yang sedang login
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Profil dosen
 */
router.get('/me', dosenAuthController.me);

/**
 * @swagger
 * /dosen-portal/jadwal:
 *   get:
 *     summary: List jadwal kuliah yang diampu dosen yang sedang login (sebagai kordinator atau pengampu)
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List jadwal kuliah
 */
router.get('/jadwal', dosenPortalController.listJadwal);

/**
 * @swagger
 * /dosen-portal/realisasi:
 *   get:
 *     summary: List realisasi mengajar (kehadiran dosen) milik dosen yang sedang login
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List realisasi mengajar
 *   post:
 *     summary: Tambah realisasi mengajar baru
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Realisasi mengajar berhasil disimpan
 */
router.get('/realisasi', dosenPortalController.listRealisasi);
router.post('/realisasi', validate(createRealisasiMengajar), dosenPortalController.createRealisasi);

/**
 * @swagger
 * /dosen-portal/realisasi/{id}:
 *   delete:
 *     summary: Hapus (soft delete) realisasi mengajar milik dosen yang sedang login
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Realisasi mengajar berhasil dihapus
 *       404:
 *         description: Realisasi mengajar not found
 */
router.delete('/realisasi/:id', dosenPortalController.removeRealisasi);

/**
 * @swagger
 * /dosen-portal/realisasi/{id}/presensi:
 *   get:
 *     summary: Get roster mahasiswa (KRS disetujui) + presensi yang sudah diisi untuk satu realisasi mengajar
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Roster & presensi mahasiswa
 *       404:
 *         description: Realisasi mengajar not found
 *   put:
 *     summary: Simpan (upsert) presensi mahasiswa untuk satu realisasi mengajar
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Presensi mahasiswa berhasil disimpan
 *       400:
 *         description: Ada mahasiswaId yang tidak terdaftar (KRS disetujui) pada kelas ini
 *       404:
 *         description: Realisasi mengajar not found
 */
router.get('/realisasi/:id/presensi', dosenPortalController.getPresensi);
router.put('/realisasi/:id/presensi', validate(savePresensiMahasiswa), dosenPortalController.savePresensi);

/**
 * @swagger
 * /dosen-portal/rekap-mahasiswa:
 *   get:
 *     summary: List mahasiswa yang mengambil KRS pada satu jadwal kuliah milik dosen yang sedang login
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List mahasiswa
 */
router.get('/rekap-mahasiswa', dosenPortalController.listRekapMahasiswa);

/**
 * @swagger
 * /dosen-portal/mata-kuliah:
 *   get:
 *     summary: List mata kuliah (+ silabus) yang diampu dosen yang sedang login
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List mata kuliah
 */
router.get('/mata-kuliah', dosenPortalController.listSilabus);

module.exports = router;
