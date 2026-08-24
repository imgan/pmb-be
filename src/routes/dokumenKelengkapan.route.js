const router = require('express').Router();
const dokumenKelengkapanController = require('../controllers/dokumenKelengkapan.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createDokumenKelengkapan, updateDokumenKelengkapan } = require('../validations/dokumenKelengkapan.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: DokumenKelengkapan
 *   description: Master data dokumen kelengkapan (file disimpan sebagai base64)
 */

/**
 * @swagger
 * /dokumen-kelengkapan:
 *   get:
 *     summary: List dokumen kelengkapan (paginated, searchable; response TIDAK menyertakan kolom file)
 *     tags: [DokumenKelengkapan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *       - name: isWajib
 *         in: query
 *         schema:
 *           type: boolean
 *         description: Filter dokumen wajib/tidak
 *       - name: isBeasiswa
 *         in: query
 *         schema:
 *           type: boolean
 *         description: Filter khusus beasiswa
 *     responses:
 *       200:
 *         description: List of dokumen kelengkapan (tanpa field file)
 *   post:
 *     summary: Create a new dokumen kelengkapan
 *     tags: [DokumenKelengkapan]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDokumenKelengkapanRequest'
 *     responses:
 *       201:
 *         description: Dokumen kelengkapan created
 */
router.get('/', authorize(MENU.DOKUMEN_KELENGKAPAN_MANAGEMENT, ACTION.READ), dokumenKelengkapanController.list);
router.post(
  '/',
  authorize(MENU.DOKUMEN_KELENGKAPAN_MANAGEMENT, ACTION.CREATE),
  validate(createDokumenKelengkapan),
  dokumenKelengkapanController.create
);

/**
 * @swagger
 * /dokumen-kelengkapan/{id}:
 *   get:
 *     summary: Get dokumen kelengkapan detail (menyertakan field file base64)
 *     tags: [DokumenKelengkapan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Dokumen kelengkapan detail
 *       404:
 *         description: Dokumen kelengkapan not found
 *   put:
 *     summary: Update a dokumen kelengkapan
 *     tags: [DokumenKelengkapan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDokumenKelengkapanRequest'
 *     responses:
 *       200:
 *         description: Dokumen kelengkapan updated
 *   delete:
 *     summary: Delete a dokumen kelengkapan
 *     tags: [DokumenKelengkapan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Dokumen kelengkapan deleted
 */
router.get('/:id', authorize(MENU.DOKUMEN_KELENGKAPAN_MANAGEMENT, ACTION.READ), dokumenKelengkapanController.detail);
router.put(
  '/:id',
  authorize(MENU.DOKUMEN_KELENGKAPAN_MANAGEMENT, ACTION.UPDATE),
  validate(updateDokumenKelengkapan),
  dokumenKelengkapanController.update
);
router.delete(
  '/:id',
  authorize(MENU.DOKUMEN_KELENGKAPAN_MANAGEMENT, ACTION.DELETE),
  dokumenKelengkapanController.remove
);

module.exports = router;
