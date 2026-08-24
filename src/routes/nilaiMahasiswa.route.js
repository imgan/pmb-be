const router = require('express').Router();
const nilaiMahasiswaController = require('../controllers/nilaiMahasiswa.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { updateNilaiEntry } = require('../validations/nilaiMahasiswa.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: NilaiMahasiswa
 *   description: Monitoring nilai mahasiswa (read-only, modul BAAK)
 */

/**
 * @swagger
 * /nilai-mahasiswa:
 *   get:
 *     summary: Cari mahasiswa berdasarkan NIM/nama untuk monitoring nilai
 *     tags: [NilaiMahasiswa]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List mahasiswa
 */
const READ_CODES = [MENU.NILAI_MONITORING_MANAGEMENT, MENU.BAAK_DASHBOARD, MENU.PRODI_NILAI_MAHASISWA_MANAGEMENT];

router.get('/', authorize(READ_CODES, ACTION.READ), nilaiMahasiswaController.list);

/**
 * @swagger
 * /nilai-mahasiswa/semester-summary:
 *   get:
 *     summary: Ringkasan rata-rata nilai per semester (untuk grafik dashboard)
 *     tags: [NilaiMahasiswa]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Ringkasan per semester
 */
router.get('/semester-summary', authorize(READ_CODES, ACTION.READ), nilaiMahasiswaController.semesterSummary);

/**
 * @swagger
 * /nilai-mahasiswa/mahasiswa/{mahasiswaId}:
 *   get:
 *     summary: Detail transkrip nilai seorang mahasiswa
 *     tags: [NilaiMahasiswa]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Detail nilai mahasiswa
 *       404:
 *         description: Mahasiswa not found
 */
router.get(
  '/mahasiswa/:mahasiswaId',
  authorize(READ_CODES, ACTION.READ),
  nilaiMahasiswaController.detail
);

/**
 * @swagger
 * /nilai-mahasiswa/entries:
 *   get:
 *     summary: Cari baris nilai (per mata kuliah) berdasarkan NIM dan/atau kode mata kuliah — untuk halaman Update Nilai
 *     tags: [NilaiMahasiswa]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: List baris nilai
 */
router.get(
  '/entries',
  authorize(MENU.PRODI_UPDATE_NILAI_MANAGEMENT, ACTION.READ),
  nilaiMahasiswaController.listEntries
);

/**
 * @swagger
 * /nilai-mahasiswa/entries/{id}:
 *   put:
 *     summary: Update komponen nilai (partisipatif/proyek/quiz/tugas/uts/uas) — nilai akhir & grade dihitung ulang otomatis
 *     tags: [NilaiMahasiswa]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Nilai updated
 *       404:
 *         description: Data nilai not found
 */
router.put(
  '/entries/:id',
  authorize(MENU.PRODI_UPDATE_NILAI_MANAGEMENT, ACTION.UPDATE),
  validate(updateNilaiEntry),
  nilaiMahasiswaController.updateEntry
);

module.exports = router;
