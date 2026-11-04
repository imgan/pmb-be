const router = require('express').Router();
const jurusanController = require('../controllers/jurusan.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createJurusan, updateJurusan, importJurusan, simpanProdiGrup } = require('../validations/jurusan.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

// Menu asal + Modul Admin → Master → Prodi (halaman yang sama).
const MANAGE_CODES = [MENU.JURUSAN_MANAGEMENT, MENU.ADMIN_MASTER_PRODI_MANAGEMENT];

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Jurusan
 *   description: Master data jurusan (setiap jurusan berelasi ke satu golongan kelas)
 */

/**
 * @swagger
 * /jurusan:
 *   get:
 *     summary: List jurusan (paginated, searchable, bisa difilter per golongan kelas)
 *     tags: [Jurusan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *       - $ref: '#/components/parameters/GolonganKelasIdQueryParam'
 *     responses:
 *       200:
 *         description: List of jurusan
 *   post:
 *     summary: Create a new jurusan
 *     tags: [Jurusan]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateJurusanRequest'
 *     responses:
 *       201:
 *         description: Jurusan created
 */
// Daftar jurusan/prodi = data referensi dropdown di banyak modul, jadi cukup login.
// Master Jurusan / Prodi: satu prodi -> banyak golongan kelas.
router.get('/grup', authorize(MANAGE_CODES, ACTION.READ), jurusanController.listGrup);
router.post('/grup', authorize(MANAGE_CODES, ACTION.CREATE), validate(simpanProdiGrup), jurusanController.createGrup);
router.put('/grup/:id', authorize(MANAGE_CODES, ACTION.UPDATE), validate(simpanProdiGrup), jurusanController.updateGrup);
router.delete('/grup/:id', authorize(MANAGE_CODES, ACTION.DELETE), jurusanController.removeGrup);

router.get('/', jurusanController.list);
router.post(
  '/',
  authorize(MANAGE_CODES, ACTION.CREATE),
  validate(createJurusan),
  jurusanController.create
);

/**
 * @swagger
 * /jurusan/export:
 *   get:
 *     summary: Export seluruh data jurusan ke file Excel (.xlsx)
 *     tags: [Jurusan]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: File Excel jurusan
 */
router.get('/export', authorize(MANAGE_CODES, ACTION.READ), jurusanController.exportExcel);

/**
 * @swagger
 * /jurusan/import-template:
 *   get:
 *     summary: Download template Excel kosong (1 baris contoh) untuk import jurusan
 *     tags: [Jurusan]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: File template Excel
 */
router.get('/import-template', authorize(MANAGE_CODES, ACTION.READ), jurusanController.importTemplate);

/**
 * @swagger
 * /jurusan/import:
 *   post:
 *     summary: Import data jurusan dari file Excel (.xlsx, base64). Membuat baru atau mengubah yang sudah ada (dicocokkan lewat Nama Jurusan). Baris valid disimpan, baris tidak valid dilewati dan dilaporkan.
 *     tags: [Jurusan]
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
router.post('/import', authorize(MANAGE_CODES, ACTION.CREATE), validate(importJurusan), jurusanController.importExcel);

/**
 * @swagger
 * /jurusan/{id}:
 *   get:
 *     summary: Get jurusan detail
 *     tags: [Jurusan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Jurusan detail
 *       404:
 *         description: Jurusan not found
 *   put:
 *     summary: Update a jurusan
 *     tags: [Jurusan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateJurusanRequest'
 *     responses:
 *       200:
 *         description: Jurusan updated
 *   delete:
 *     summary: Soft delete a jurusan (set isDelete = true)
 *     tags: [Jurusan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Jurusan deleted
 */
router.get('/:id', authorize(MANAGE_CODES, ACTION.READ), jurusanController.detail);
router.put(
  '/:id',
  authorize(MANAGE_CODES, ACTION.UPDATE),
  validate(updateJurusan),
  jurusanController.update
);
router.delete('/:id', authorize(MANAGE_CODES, ACTION.DELETE), jurusanController.remove);

module.exports = router;
