const router = require('express').Router();
const dosenController = require('../controllers/dosen.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createDosen, updateDosen, importDosen } = require('../validations/dosen.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Dosen
 *   description: Master data dosen (modul SDI)
 */

/**
 * @swagger
 * /dosen:
 *   get:
 *     summary: List dosen (paginated, searchable, bisa difilter per kelompok fakultas)
 *     tags: [Dosen]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List of dosen
 *   post:
 *     summary: Create a new dosen
 *     tags: [Dosen]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Dosen created
 */
router.get('/', authorize(MENU.DOSEN_MANAGEMENT, ACTION.READ), dosenController.list);
router.post('/', authorize(MENU.DOSEN_MANAGEMENT, ACTION.CREATE), validate(createDosen), dosenController.create);

/**
 * @swagger
 * /dosen/stats:
 *   get:
 *     summary: Ringkasan jumlah dosen dikelompokkan per kelompok fakultas
 *     tags: [Dosen]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Ringkasan per kelompok fakultas
 */
router.get('/stats', authorize([MENU.DOSEN_MANAGEMENT, MENU.BAAK_DASHBOARD], ACTION.READ), dosenController.stats);

/**
 * @swagger
 * /dosen/export:
 *   get:
 *     summary: Export seluruh data dosen ke file Excel (.xlsx)
 *     tags: [Dosen]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: File Excel dosen
 */
router.get('/export', authorize(MENU.DOSEN_MANAGEMENT, ACTION.READ), dosenController.exportExcel);

/**
 * @swagger
 * /dosen/import-template:
 *   get:
 *     summary: Download template Excel kosong (1 baris contoh) untuk import dosen
 *     tags: [Dosen]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: File template Excel
 */
router.get('/import-template', authorize(MENU.DOSEN_MANAGEMENT, ACTION.READ), dosenController.importTemplate);

/**
 * @swagger
 * /dosen/import:
 *   post:
 *     summary: Import data dosen dari file Excel (.xlsx, base64). Baris valid disimpan (upsert per NIDN), baris tidak valid dilewati dan dilaporkan.
 *     tags: [Dosen]
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
router.post('/import', authorize(MENU.DOSEN_MANAGEMENT, ACTION.CREATE), validate(importDosen), dosenController.importExcel);

/**
 * @swagger
 * /dosen/{id}:
 *   get:
 *     summary: Get dosen detail
 *     tags: [Dosen]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Dosen detail
 *       404:
 *         description: Dosen not found
 *   put:
 *     summary: Update a dosen
 *     tags: [Dosen]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Dosen updated
 *   delete:
 *     summary: Soft delete a dosen (set isDelete = true)
 *     tags: [Dosen]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Dosen deleted
 */
router.get('/:id', authorize(MENU.DOSEN_MANAGEMENT, ACTION.READ), dosenController.detail);
router.put('/:id', authorize(MENU.DOSEN_MANAGEMENT, ACTION.UPDATE), validate(updateDosen), dosenController.update);
router.delete('/:id', authorize(MENU.DOSEN_MANAGEMENT, ACTION.DELETE), dosenController.remove);

module.exports = router;
