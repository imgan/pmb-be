const router = require('express').Router();
const ukuranAlmamaterController = require('../controllers/ukuranAlmamater.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createUkuranAlmamater, updateUkuranAlmamater } = require('../validations/ukuranAlmamater.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: UkuranAlmamater
 *   description: Master data ukuran almamater
 */

/**
 * @swagger
 * /ukuran-almamater:
 *   get:
 *     summary: List ukuran almamater (paginated, searchable)
 *     tags: [UkuranAlmamater]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List of ukuran almamater
 *   post:
 *     summary: Create a new ukuran almamater
 *     tags: [UkuranAlmamater]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUkuranAlmamaterRequest'
 *     responses:
 *       201:
 *         description: Ukuran almamater created
 */
router.get('/', authorize(MENU.UKURAN_ALMAMATER_MANAGEMENT, ACTION.READ), ukuranAlmamaterController.list);
router.post(
  '/',
  authorize(MENU.UKURAN_ALMAMATER_MANAGEMENT, ACTION.CREATE),
  validate(createUkuranAlmamater),
  ukuranAlmamaterController.create
);

/**
 * @swagger
 * /ukuran-almamater/{id}:
 *   get:
 *     summary: Get ukuran almamater detail
 *     tags: [UkuranAlmamater]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Ukuran almamater detail
 *       404:
 *         description: Ukuran almamater not found
 *   put:
 *     summary: Update a ukuran almamater
 *     tags: [UkuranAlmamater]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUkuranAlmamaterRequest'
 *     responses:
 *       200:
 *         description: Ukuran almamater updated
 *   delete:
 *     summary: Delete a ukuran almamater
 *     tags: [UkuranAlmamater]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Ukuran almamater deleted
 */
router.get('/:id', authorize(MENU.UKURAN_ALMAMATER_MANAGEMENT, ACTION.READ), ukuranAlmamaterController.detail);
router.put(
  '/:id',
  authorize(MENU.UKURAN_ALMAMATER_MANAGEMENT, ACTION.UPDATE),
  validate(updateUkuranAlmamater),
  ukuranAlmamaterController.update
);
router.delete('/:id', authorize(MENU.UKURAN_ALMAMATER_MANAGEMENT, ACTION.DELETE), ukuranAlmamaterController.remove);

module.exports = router;
