const router = require('express').Router();
const pembayaranController = require('../controllers/pembayaran.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createPembayaran, updatePembayaran } = require('../validations/pembayaran.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Pembayaran
 *   description: Master data list pembayaran
 */

/**
 * @swagger
 * /pembayaran:
 *   get:
 *     summary: List pembayaran (paginated, searchable, filter isBeasiswa)
 *     tags: [Pembayaran]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *       - name: isBeasiswa
 *         in: query
 *         schema:
 *           type: boolean
 *         description: Filter pembayaran khusus beasiswa
 *     responses:
 *       200:
 *         description: List of pembayaran
 *   post:
 *     summary: Create a new pembayaran
 *     tags: [Pembayaran]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePembayaranRequest'
 *     responses:
 *       201:
 *         description: Pembayaran created
 */
router.get('/', authorize(MENU.PEMBAYARAN_MANAGEMENT, ACTION.READ), pembayaranController.list);
router.post(
  '/',
  authorize(MENU.PEMBAYARAN_MANAGEMENT, ACTION.CREATE),
  validate(createPembayaran),
  pembayaranController.create
);

/**
 * @swagger
 * /pembayaran/{id}:
 *   get:
 *     summary: Get pembayaran detail
 *     tags: [Pembayaran]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Pembayaran detail
 *       404:
 *         description: Pembayaran not found
 *   put:
 *     summary: Update a pembayaran
 *     tags: [Pembayaran]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePembayaranRequest'
 *     responses:
 *       200:
 *         description: Pembayaran updated
 *   delete:
 *     summary: Delete a pembayaran
 *     tags: [Pembayaran]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Pembayaran deleted
 */
router.get('/:id', authorize(MENU.PEMBAYARAN_MANAGEMENT, ACTION.READ), pembayaranController.detail);
router.put(
  '/:id',
  authorize(MENU.PEMBAYARAN_MANAGEMENT, ACTION.UPDATE),
  validate(updatePembayaran),
  pembayaranController.update
);
router.delete('/:id', authorize(MENU.PEMBAYARAN_MANAGEMENT, ACTION.DELETE), pembayaranController.remove);

module.exports = router;
