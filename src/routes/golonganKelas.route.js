const router = require('express').Router();
const golonganKelasController = require('../controllers/golonganKelas.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createGolonganKelas, updateGolonganKelas } = require('../validations/golonganKelas.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: GolonganKelas
 *   description: Master data golongan kelas (satu golongan kelas memiliki banyak jurusan)
 */

/**
 * @swagger
 * /golongan-kelas:
 *   get:
 *     summary: List golongan kelas (paginated, searchable)
 *     tags: [GolonganKelas]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List of golongan kelas
 *   post:
 *     summary: Create a new golongan kelas
 *     tags: [GolonganKelas]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateGolonganKelasRequest'
 *     responses:
 *       201:
 *         description: Golongan kelas created
 */
router.get('/', authorize(MENU.GOLONGAN_KELAS_MANAGEMENT, ACTION.READ), golonganKelasController.list);
router.post(
  '/',
  authorize(MENU.GOLONGAN_KELAS_MANAGEMENT, ACTION.CREATE),
  validate(createGolonganKelas),
  golonganKelasController.create
);

/**
 * @swagger
 * /golongan-kelas/{id}:
 *   get:
 *     summary: Get golongan kelas detail
 *     tags: [GolonganKelas]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Golongan kelas detail
 *       404:
 *         description: Golongan kelas not found
 *   put:
 *     summary: Update a golongan kelas
 *     tags: [GolonganKelas]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateGolonganKelasRequest'
 *     responses:
 *       200:
 *         description: Golongan kelas updated
 *   delete:
 *     summary: Soft delete a golongan kelas (set isDelete = true)
 *     tags: [GolonganKelas]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Golongan kelas deleted
 */
router.get('/:id', authorize(MENU.GOLONGAN_KELAS_MANAGEMENT, ACTION.READ), golonganKelasController.detail);
router.put(
  '/:id',
  authorize(MENU.GOLONGAN_KELAS_MANAGEMENT, ACTION.UPDATE),
  validate(updateGolonganKelas),
  golonganKelasController.update
);
router.delete('/:id', authorize(MENU.GOLONGAN_KELAS_MANAGEMENT, ACTION.DELETE), golonganKelasController.remove);

module.exports = router;
