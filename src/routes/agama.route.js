const router = require('express').Router();
const agamaController = require('../controllers/agama.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createAgama, updateAgama } = require('../validations/agama.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Agama
 *   description: Master data agama (Modul Admin)
 */

/**
 * @swagger
 * /agama:
 *   get:
 *     summary: List agama (paginated, searchable)
 *     tags: [Agama]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List of agama
 *   post:
 *     summary: Create a new agama
 *     tags: [Agama]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Agama created
 */
router.get('/', authorize(MENU.ADMIN_MASTER_AGAMA_MANAGEMENT, ACTION.READ), agamaController.list);
router.post('/', authorize(MENU.ADMIN_MASTER_AGAMA_MANAGEMENT, ACTION.CREATE), validate(createAgama), agamaController.create);

/**
 * @swagger
 * /agama/{id}:
 *   get:
 *     summary: Get agama detail
 *     tags: [Agama]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Agama detail
 *   put:
 *     summary: Update an agama
 *     tags: [Agama]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Agama updated
 *   delete:
 *     summary: Delete an agama (soft delete)
 *     tags: [Agama]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Agama deleted
 */
router.get('/:id', authorize(MENU.ADMIN_MASTER_AGAMA_MANAGEMENT, ACTION.READ), agamaController.detail);
router.put('/:id', authorize(MENU.ADMIN_MASTER_AGAMA_MANAGEMENT, ACTION.UPDATE), validate(updateAgama), agamaController.update);
router.delete('/:id', authorize(MENU.ADMIN_MASTER_AGAMA_MANAGEMENT, ACTION.DELETE), agamaController.remove);

module.exports = router;
