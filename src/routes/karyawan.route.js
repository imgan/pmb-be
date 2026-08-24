const router = require('express').Router();
const karyawanController = require('../controllers/karyawan.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createKaryawan, updateKaryawan, importKaryawan } = require('../validations/karyawan.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Karyawan
 *   description: Master data karyawan di lingkungan SDI (Sumber Daya Insani)
 */

/**
 * @swagger
 * /karyawan/summary:
 *   get:
 *     summary: Ringkasan jumlah karyawan berdasarkan jenis kelamin
 *     tags: [Karyawan]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Ringkasan karyawan
 */
router.get('/summary', authorize(MENU.KARYAWAN_MANAGEMENT, ACTION.READ), karyawanController.genderSummary);

/**
 * @swagger
 * /karyawan/export:
 *   get:
 *     summary: Export seluruh data karyawan ke file Excel (.xlsx)
 *     tags: [Karyawan]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: File Excel karyawan
 */
router.get('/export', authorize(MENU.KARYAWAN_MANAGEMENT, ACTION.READ), karyawanController.exportExcel);

/**
 * @swagger
 * /karyawan/import-template:
 *   get:
 *     summary: Download template Excel kosong (1 baris contoh) untuk import karyawan
 *     tags: [Karyawan]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: File template Excel
 */
router.get('/import-template', authorize(MENU.KARYAWAN_MANAGEMENT, ACTION.READ), karyawanController.importTemplate);

/**
 * @swagger
 * /karyawan/import:
 *   post:
 *     summary: Import data karyawan dari file Excel (.xlsx, base64). Baris valid disimpan (upsert per NIP), baris tidak valid dilewati dan dilaporkan.
 *     tags: [Karyawan]
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
router.post('/import', authorize(MENU.KARYAWAN_MANAGEMENT, ACTION.CREATE), validate(importKaryawan), karyawanController.importExcel);

/**
 * @swagger
 * /karyawan:
 *   get:
 *     summary: List karyawan (paginated, searchable, sortable)
 *     tags: [Karyawan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List of karyawan
 *   post:
 *     summary: Create a new karyawan
 *     tags: [Karyawan]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateKaryawanRequest'
 *     responses:
 *       201:
 *         description: Karyawan created
 */
router.get('/', authorize(MENU.KARYAWAN_MANAGEMENT, ACTION.READ), karyawanController.list);
router.post('/', authorize(MENU.KARYAWAN_MANAGEMENT, ACTION.CREATE), validate(createKaryawan), karyawanController.create);

/**
 * @swagger
 * /karyawan/{id}:
 *   get:
 *     summary: Get karyawan detail
 *     tags: [Karyawan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Karyawan detail
 *       404:
 *         description: Karyawan not found
 *   put:
 *     summary: Update a karyawan
 *     tags: [Karyawan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateKaryawanRequest'
 *     responses:
 *       200:
 *         description: Karyawan updated
 *   delete:
 *     summary: Delete (soft-delete) a karyawan
 *     tags: [Karyawan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Karyawan deleted
 */
router.get('/:id', authorize(MENU.KARYAWAN_MANAGEMENT, ACTION.READ), karyawanController.detail);
router.put('/:id', authorize(MENU.KARYAWAN_MANAGEMENT, ACTION.UPDATE), validate(updateKaryawan), karyawanController.update);
router.delete('/:id', authorize(MENU.KARYAWAN_MANAGEMENT, ACTION.DELETE), karyawanController.remove);

module.exports = router;
