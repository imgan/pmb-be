const router = require('express').Router();
const mahasiswaController = require('../controllers/mahasiswa.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { updateMahasiswa, generateMahasiswa, importMahasiswa } = require('../validations/mahasiswa.validation');
const { saveMahasiswaBiodata } = require('../validations/mahasiswaBiodata.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Mahasiswa
 *   description: Master data mahasiswa, digenerate dari peserta yang lulus ujian PMB
 */

/**
 * @swagger
 * /mahasiswa/eligible-peserta:
 *   get:
 *     summary: List peserta yang sudah lulus ujian & diterima namun belum digenerate menjadi mahasiswa
 *     tags: [Mahasiswa]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List peserta siap digenerate
 */
router.get(
  '/eligible-peserta',
  authorize(MENU.MAHASISWA_MANAGEMENT, ACTION.READ),
  mahasiswaController.eligiblePeserta
);

/**
 * @swagger
 * /mahasiswa/eligible-summary:
 *   get:
 *     summary: Ringkasan jumlah peserta siap digenerate, dikelompokkan per jurusan
 *     tags: [Mahasiswa]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Ringkasan per jurusan
 */
router.get(
  '/eligible-summary',
  authorize(MENU.MAHASISWA_MANAGEMENT, ACTION.READ),
  mahasiswaController.eligibleSummary
);

/**
 * @swagger
 * /mahasiswa/generate:
 *   post:
 *     summary: Generate NIM & batch-insert mahasiswa dari peserta yang lulus ujian PMB (satu kali bulk insert, bukan loop)
 *     tags: [Mahasiswa]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenerateMahasiswaRequest'
 *     responses:
 *       201:
 *         description: Mahasiswa berhasil digenerate
 *       400:
 *         description: Tidak ada peserta yang siap / prefix jurusan belum lengkap
 */
router.post('/generate', authorize(MENU.MAHASISWA_MANAGEMENT, ACTION.CREATE), validate(generateMahasiswa), mahasiswaController.generate);

/**
 * @swagger
 * /mahasiswa/export:
 *   get:
 *     summary: Export seluruh data mahasiswa ke file Excel (.xlsx)
 *     tags: [Mahasiswa]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: File Excel mahasiswa
 */
router.get('/export', authorize(MENU.MAHASISWA_MANAGEMENT, ACTION.READ), mahasiswaController.exportExcel);

/**
 * @swagger
 * /mahasiswa/import-template:
 *   get:
 *     summary: Download template Excel kosong (1 baris contoh) untuk import mahasiswa
 *     tags: [Mahasiswa]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: File template Excel
 */
router.get('/import-template', authorize(MENU.MAHASISWA_MANAGEMENT, ACTION.READ), mahasiswaController.importTemplate);

/**
 * @swagger
 * /mahasiswa/import:
 *   post:
 *     summary: Import data mahasiswa dari file Excel (.xlsx, base64). Hanya MENGUBAH mahasiswa yang sudah ada (dicocokkan lewat NIM) — tidak membuat baru. Baris valid disimpan, baris tidak valid dilewati dan dilaporkan.
 *     tags: [Mahasiswa]
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
router.post('/import', authorize(MENU.MAHASISWA_MANAGEMENT, ACTION.UPDATE), validate(importMahasiswa), mahasiswaController.importExcel);

/**
 * @swagger
 * /mahasiswa:
 *   get:
 *     summary: List mahasiswa (paginated, searchable)
 *     tags: [Mahasiswa]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List of mahasiswa
 */
const LIST_CODES = [MENU.MAHASISWA_MANAGEMENT, MENU.PRODI_MAHASISWA_KELUAR_MANAGEMENT];

router.get('/', authorize(LIST_CODES, ACTION.READ), mahasiswaController.list);

/**
 * @swagger
 * /mahasiswa/{id}:
 *   get:
 *     summary: Get mahasiswa detail
 *     tags: [Mahasiswa]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Mahasiswa detail
 *       404:
 *         description: Mahasiswa not found
 *   put:
 *     summary: Update a mahasiswa
 *     tags: [Mahasiswa]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMahasiswaRequest'
 *     responses:
 *       200:
 *         description: Mahasiswa updated
 *   delete:
 *     summary: Delete a mahasiswa
 *     tags: [Mahasiswa]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Mahasiswa deleted
 */
router.get('/:id', authorize(LIST_CODES, ACTION.READ), mahasiswaController.detail);
router.put('/:id', authorize(LIST_CODES, ACTION.UPDATE), validate(updateMahasiswa), mahasiswaController.update);
router.delete('/:id', authorize(MENU.MAHASISWA_MANAGEMENT, ACTION.DELETE), mahasiswaController.remove);

/**
 * @swagger
 * /mahasiswa/{id}/biodata:
 *   get:
 *     summary: Get biodata lengkap mahasiswa (alamat, orang tua, data PDDIKTI)
 *     tags: [Mahasiswa]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Biodata mahasiswa (null jika belum diisi)
 *       404:
 *         description: Mahasiswa not found
 *   put:
 *     summary: Simpan / perbarui biodata lengkap mahasiswa
 *     tags: [Mahasiswa]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SaveMahasiswaBiodataRequest'
 *     responses:
 *       200:
 *         description: Biodata mahasiswa saved
 *       404:
 *         description: Mahasiswa not found
 */
const BIODATA_CODES = [MENU.MAHASISWA_MANAGEMENT, MENU.YUDISIUM_MANAGEMENT, MENU.PRODI_BIODATA_MAHASISWA_MANAGEMENT];

router.get('/:id/biodata', authorize(BIODATA_CODES, ACTION.READ), mahasiswaController.getBiodata);
router.put(
  '/:id/biodata',
  authorize(BIODATA_CODES, ACTION.UPDATE),
  validate(saveMahasiswaBiodata),
  mahasiswaController.saveBiodata
);

module.exports = router;
