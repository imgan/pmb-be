const router = require('express').Router();
const jadwalKuliahController = require('../controllers/jadwalKuliah.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createJadwalKuliah, updateJadwalKuliah, importJadwalKuliah } = require('../validations/jadwalKuliah.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: JadwalKuliah
 *   description: Master jadwal kuliah (modul BAAK)
 */

/**
 * @swagger
 * /jadwal-kuliah:
 *   get:
 *     summary: List jadwal kuliah (paginated, searchable, sortable)
 *     tags: [JadwalKuliah]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List of jadwal kuliah
 *   post:
 *     summary: Create a new jadwal kuliah
 *     tags: [JadwalKuliah]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateJadwalKuliahRequest'
 *     responses:
 *       201:
 *         description: Jadwal kuliah created
 */
const READ_CODES = [
  MENU.JADWAL_KULIAH_MANAGEMENT,
  MENU.MASTER_MONITORING_MANAGEMENT,
  MENU.LAPORAN_CETAK_KEHADIRAN_MENGAJAR_MANAGEMENT,
  MENU.PRODI_JADWAL_KULIAH_MANAGEMENT,
];
const WRITE_CODES = [MENU.JADWAL_KULIAH_MANAGEMENT, MENU.PRODI_JADWAL_KULIAH_MANAGEMENT];

router.get('/', authorize(READ_CODES, ACTION.READ), jadwalKuliahController.list);
router.post(
  '/',
  authorize(WRITE_CODES, ACTION.CREATE),
  validate(createJadwalKuliah),
  jadwalKuliahController.create
);

/**
 * @swagger
 * /jadwal-kuliah/kelas-options:
 *   get:
 *     summary: List kelas unik dari jadwal kuliah (untuk dropdown filter "Pilih Program")
 *     tags: [JadwalKuliah]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of kelas
 */
router.get('/kelas-options', authorize(READ_CODES, ACTION.READ), jadwalKuliahController.kelasOptions);

/**
 * @swagger
 * /jadwal-kuliah/export:
 *   get:
 *     summary: Export seluruh data jadwal kuliah ke file Excel (.xlsx)
 *     tags: [JadwalKuliah]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: File Excel jadwal kuliah
 */
router.get('/export', authorize(READ_CODES, ACTION.READ), jadwalKuliahController.exportExcel);

/**
 * @swagger
 * /jadwal-kuliah/import-template:
 *   get:
 *     summary: Download template Excel kosong (1 baris contoh) untuk import jadwal kuliah
 *     tags: [JadwalKuliah]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: File template Excel
 */
router.get('/import-template', authorize(READ_CODES, ACTION.READ), jadwalKuliahController.importTemplate);

/**
 * @swagger
 * /jadwal-kuliah/import:
 *   post:
 *     summary: Import data jadwal kuliah dari file Excel (.xlsx, base64). Baris valid disimpan (upsert per Kelas+Kode Mata Kuliah), baris tidak valid dilewati dan dilaporkan.
 *     tags: [JadwalKuliah]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 description: Base64 data URI file .xlsx
 *     responses:
 *       200:
 *         description: Ringkasan hasil import
 */
router.post(
  '/import',
  authorize(WRITE_CODES, ACTION.CREATE),
  validate(importJadwalKuliah),
  jadwalKuliahController.importExcel
);

/**
 * @swagger
 * /jadwal-kuliah/{id}:
 *   get:
 *     summary: Get jadwal kuliah detail
 *     tags: [JadwalKuliah]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Jadwal kuliah detail
 *       404:
 *         description: Jadwal kuliah not found
 *   put:
 *     summary: Update a jadwal kuliah
 *     tags: [JadwalKuliah]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateJadwalKuliahRequest'
 *     responses:
 *       200:
 *         description: Jadwal kuliah updated
 *   delete:
 *     summary: Delete a jadwal kuliah
 *     tags: [JadwalKuliah]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Jadwal kuliah deleted
 */
router.get('/:id', authorize(READ_CODES, ACTION.READ), jadwalKuliahController.detail);
router.put(
  '/:id',
  authorize(WRITE_CODES, ACTION.UPDATE),
  validate(updateJadwalKuliah),
  jadwalKuliahController.update
);
router.delete('/:id', authorize(WRITE_CODES, ACTION.DELETE), jadwalKuliahController.remove);

module.exports = router;
