const router = require('express').Router();
const dosenController = require('../controllers/dosen.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createDosen, updateDosen, importDosen } = require('../validations/dosen.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

// Menu asal + Modul Admin → Master → Dosen (halaman yang sama).
const MANAGE_CODES = [MENU.DOSEN_MANAGEMENT, MENU.ADMIN_MASTER_DOSEN_MANAGEMENT];

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
router.get('/', authorize(MANAGE_CODES, ACTION.READ), dosenController.list);
router.post('/', authorize(MANAGE_CODES, ACTION.CREATE), validate(createDosen), dosenController.create);

/**
 * @swagger
 * /dosen/stats:
 *   get:
 *     summary: Ringkasan jumlah dosen per kelompok fakultas, atau per prodi homebase (groupBy=prodi)
 *     tags: [Dosen]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: groupBy
 *         schema: { type: string, enum: [prodi] }
 *     responses:
 *       200:
 *         description: Ringkasan jumlah dosen
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
router.get('/export', authorize(MANAGE_CODES, ACTION.READ), dosenController.exportExcel);

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
router.get('/import-template', authorize(MANAGE_CODES, ACTION.READ), dosenController.importTemplate);

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
router.post('/import', authorize(MANAGE_CODES, ACTION.CREATE), validate(importDosen), dosenController.importExcel);

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
router.get('/:id', authorize(MANAGE_CODES, ACTION.READ), dosenController.detail);
router.put('/:id', authorize(MANAGE_CODES, ACTION.UPDATE), validate(updateDosen), dosenController.update);
router.delete('/:id', authorize(MANAGE_CODES, ACTION.DELETE), dosenController.remove);

/**
 * @swagger
 * /dosen/{id}/reset-password:
 *   post:
 *     summary: Reset password portal dosen ke NIP
 *     tags: [Dosen]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: Password direset
 */
router.post('/:id/reset-password', authorize(MANAGE_CODES, ACTION.UPDATE), dosenController.resetPassword);

module.exports = router;
