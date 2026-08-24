const router = require('express').Router();
const dokumenPendaftaranController = require('../controllers/dokumenPendaftaran.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createDokumenPendaftaran, updateDokumenPendaftaran } = require('../validations/dokumenPendaftaran.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: DokumenPendaftaran
 *   description: Master data dokumen pendaftaran
 */

/**
 * @swagger
 * /dokumen-pendaftaran:
 *   get:
 *     summary: List dokumen pendaftaran (paginated, searchable, filter isWajib)
 *     tags: [DokumenPendaftaran]
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
 *     responses:
 *       200:
 *         description: List of dokumen pendaftaran
 *   post:
 *     summary: Create a new dokumen pendaftaran
 *     tags: [DokumenPendaftaran]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDokumenPendaftaranRequest'
 *     responses:
 *       201:
 *         description: Dokumen pendaftaran created
 */
router.get('/', authorize(MENU.DOKUMEN_PENDAFTARAN_MANAGEMENT, ACTION.READ), dokumenPendaftaranController.list);
router.post(
  '/',
  authorize(MENU.DOKUMEN_PENDAFTARAN_MANAGEMENT, ACTION.CREATE),
  validate(createDokumenPendaftaran),
  dokumenPendaftaranController.create
);

/**
 * @swagger
 * /dokumen-pendaftaran/{id}:
 *   get:
 *     summary: Get dokumen pendaftaran detail
 *     tags: [DokumenPendaftaran]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Dokumen pendaftaran detail
 *       404:
 *         description: Dokumen pendaftaran not found
 *   put:
 *     summary: Update a dokumen pendaftaran
 *     tags: [DokumenPendaftaran]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDokumenPendaftaranRequest'
 *     responses:
 *       200:
 *         description: Dokumen pendaftaran updated
 *   delete:
 *     summary: Delete a dokumen pendaftaran
 *     tags: [DokumenPendaftaran]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Dokumen pendaftaran deleted
 */
router.get('/:id', authorize(MENU.DOKUMEN_PENDAFTARAN_MANAGEMENT, ACTION.READ), dokumenPendaftaranController.detail);
router.put(
  '/:id',
  authorize(MENU.DOKUMEN_PENDAFTARAN_MANAGEMENT, ACTION.UPDATE),
  validate(updateDokumenPendaftaran),
  dokumenPendaftaranController.update
);
router.delete(
  '/:id',
  authorize(MENU.DOKUMEN_PENDAFTARAN_MANAGEMENT, ACTION.DELETE),
  dokumenPendaftaranController.remove
);

module.exports = router;
