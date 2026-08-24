const router = require('express').Router();
const gelombangController = require('../controllers/gelombang.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createGelombang, updateGelombang } = require('../validations/gelombang.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Gelombang
 *   description: Master data gelombang (pendaftaran)
 */

/**
 * @swagger
 * /gelombang:
 *   get:
 *     summary: List gelombang (paginated, searchable)
 *     tags: [Gelombang]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List of gelombang
 *   post:
 *     summary: Create a new gelombang
 *     tags: [Gelombang]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateGelombangRequest'
 *     responses:
 *       201:
 *         description: Gelombang created
 *       400:
 *         description: Validation error (mis. endDate < startDate)
 */
router.get('/', authorize(MENU.GELOMBANG_MANAGEMENT, ACTION.READ), gelombangController.list);
router.post(
  '/',
  authorize(MENU.GELOMBANG_MANAGEMENT, ACTION.CREATE),
  validate(createGelombang),
  gelombangController.create
);

/**
 * @swagger
 * /gelombang/{id}:
 *   get:
 *     summary: Get gelombang detail
 *     tags: [Gelombang]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Gelombang detail
 *       404:
 *         description: Gelombang not found
 *   put:
 *     summary: Update a gelombang
 *     tags: [Gelombang]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateGelombangRequest'
 *     responses:
 *       200:
 *         description: Gelombang updated
 *       400:
 *         description: Validation error (mis. endDate < startDate)
 *   delete:
 *     summary: Delete a gelombang
 *     tags: [Gelombang]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Gelombang deleted
 */
router.get('/:id', authorize(MENU.GELOMBANG_MANAGEMENT, ACTION.READ), gelombangController.detail);
router.put(
  '/:id',
  authorize(MENU.GELOMBANG_MANAGEMENT, ACTION.UPDATE),
  validate(updateGelombang),
  gelombangController.update
);
router.delete('/:id', authorize(MENU.GELOMBANG_MANAGEMENT, ACTION.DELETE), gelombangController.remove);

module.exports = router;
