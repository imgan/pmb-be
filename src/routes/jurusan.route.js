const router = require('express').Router();
const jurusanController = require('../controllers/jurusan.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createJurusan, updateJurusan } = require('../validations/jurusan.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Jurusan
 *   description: Master data jurusan (setiap jurusan berelasi ke satu golongan kelas)
 */

/**
 * @swagger
 * /jurusan:
 *   get:
 *     summary: List jurusan (paginated, searchable, bisa difilter per golongan kelas)
 *     tags: [Jurusan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *       - $ref: '#/components/parameters/GolonganKelasIdQueryParam'
 *     responses:
 *       200:
 *         description: List of jurusan
 *   post:
 *     summary: Create a new jurusan
 *     tags: [Jurusan]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateJurusanRequest'
 *     responses:
 *       201:
 *         description: Jurusan created
 */
router.get('/', authorize(MENU.JURUSAN_MANAGEMENT, ACTION.READ), jurusanController.list);
router.post(
  '/',
  authorize(MENU.JURUSAN_MANAGEMENT, ACTION.CREATE),
  validate(createJurusan),
  jurusanController.create
);

/**
 * @swagger
 * /jurusan/{id}:
 *   get:
 *     summary: Get jurusan detail
 *     tags: [Jurusan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Jurusan detail
 *       404:
 *         description: Jurusan not found
 *   put:
 *     summary: Update a jurusan
 *     tags: [Jurusan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateJurusanRequest'
 *     responses:
 *       200:
 *         description: Jurusan updated
 *   delete:
 *     summary: Soft delete a jurusan (set isDelete = true)
 *     tags: [Jurusan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Jurusan deleted
 */
router.get('/:id', authorize(MENU.JURUSAN_MANAGEMENT, ACTION.READ), jurusanController.detail);
router.put(
  '/:id',
  authorize(MENU.JURUSAN_MANAGEMENT, ACTION.UPDATE),
  validate(updateJurusan),
  jurusanController.update
);
router.delete('/:id', authorize(MENU.JURUSAN_MANAGEMENT, ACTION.DELETE), jurusanController.remove);

module.exports = router;
