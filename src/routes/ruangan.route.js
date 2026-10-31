const router = require('express').Router();
const ruanganController = require('../controllers/ruangan.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createRuangan, updateRuangan } = require('../validations/ruangan.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Ruangan
 *   description: Master data ruangan (Modul Admin)
 */

/**
 * @swagger
 * /ruangan:
 *   get:
 *     summary: List ruangan (paginated, searchable)
 *     tags: [Ruangan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List of ruangan
 *   post:
 *     summary: Create a new ruangan
 *     tags: [Ruangan]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Ruangan created
 */
router.get('/', authorize(MENU.RUANGAN_MANAGEMENT, ACTION.READ), ruanganController.list);
router.post('/', authorize(MENU.RUANGAN_MANAGEMENT, ACTION.CREATE), validate(createRuangan), ruanganController.create);

/**
 * @swagger
 * /ruangan/{id}:
 *   get:
 *     summary: Get ruangan detail
 *     tags: [Ruangan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Ruangan detail
 *   put:
 *     summary: Update a ruangan
 *     tags: [Ruangan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Ruangan updated
 *   delete:
 *     summary: Delete a ruangan (soft delete)
 *     tags: [Ruangan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Ruangan deleted
 */
router.get('/:id', authorize(MENU.RUANGAN_MANAGEMENT, ACTION.READ), ruanganController.detail);
router.put('/:id', authorize(MENU.RUANGAN_MANAGEMENT, ACTION.UPDATE), validate(updateRuangan), ruanganController.update);
router.delete('/:id', authorize(MENU.RUANGAN_MANAGEMENT, ACTION.DELETE), ruanganController.remove);

module.exports = router;
