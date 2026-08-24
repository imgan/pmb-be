const router = require('express').Router();
const sumberInformasiController = require('../controllers/sumberInformasi.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createSumberInformasi, updateSumberInformasi } = require('../validations/sumberInformasi.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: SumberInformasi
 *   description: Master data sumber informasi
 */

/**
 * @swagger
 * /sumber-informasi:
 *   get:
 *     summary: List sumber informasi (paginated, searchable)
 *     tags: [SumberInformasi]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List of sumber informasi
 *   post:
 *     summary: Create a new sumber informasi
 *     tags: [SumberInformasi]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSumberInformasiRequest'
 *     responses:
 *       201:
 *         description: Sumber informasi created
 */
router.get('/', authorize(MENU.SUMBER_INFORMASI_MANAGEMENT, ACTION.READ), sumberInformasiController.list);
router.post(
  '/',
  authorize(MENU.SUMBER_INFORMASI_MANAGEMENT, ACTION.CREATE),
  validate(createSumberInformasi),
  sumberInformasiController.create
);

/**
 * @swagger
 * /sumber-informasi/{id}:
 *   get:
 *     summary: Get sumber informasi detail
 *     tags: [SumberInformasi]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Sumber informasi detail
 *       404:
 *         description: Sumber informasi not found
 *   put:
 *     summary: Update a sumber informasi
 *     tags: [SumberInformasi]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSumberInformasiRequest'
 *     responses:
 *       200:
 *         description: Sumber informasi updated
 *   delete:
 *     summary: Delete a sumber informasi
 *     tags: [SumberInformasi]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Sumber informasi deleted
 */
router.get('/:id', authorize(MENU.SUMBER_INFORMASI_MANAGEMENT, ACTION.READ), sumberInformasiController.detail);
router.put(
  '/:id',
  authorize(MENU.SUMBER_INFORMASI_MANAGEMENT, ACTION.UPDATE),
  validate(updateSumberInformasi),
  sumberInformasiController.update
);
router.delete('/:id', authorize(MENU.SUMBER_INFORMASI_MANAGEMENT, ACTION.DELETE), sumberInformasiController.remove);

module.exports = router;
