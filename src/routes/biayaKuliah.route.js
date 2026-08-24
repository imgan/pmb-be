const router = require('express').Router();
const biayaKuliahController = require('../controllers/biayaKuliah.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createBiayaKuliah, updateBiayaKuliah } = require('../validations/biayaKuliah.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: BiayaKuliah
 *   description: Konten halaman biaya kuliah yang tampil di website publik
 */

/**
 * @swagger
 * /biaya-kuliah:
 *   get:
 *     summary: List biaya kuliah (paginated, searchable)
 *     tags: [BiayaKuliah]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List of biaya kuliah
 *   post:
 *     summary: Create a new biaya kuliah page
 *     tags: [BiayaKuliah]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBiayaKuliahRequest'
 *     responses:
 *       201:
 *         description: Biaya kuliah created
 */
router.get('/', authorize(MENU.BIAYA_KULIAH_MANAGEMENT, ACTION.READ), biayaKuliahController.list);
router.post(
  '/',
  authorize(MENU.BIAYA_KULIAH_MANAGEMENT, ACTION.CREATE),
  validate(createBiayaKuliah),
  biayaKuliahController.create
);

/**
 * @swagger
 * /biaya-kuliah/{id}:
 *   get:
 *     summary: Get biaya kuliah detail
 *     tags: [BiayaKuliah]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Biaya kuliah detail
 *       404:
 *         description: Biaya kuliah not found
 *   put:
 *     summary: Update a biaya kuliah page
 *     tags: [BiayaKuliah]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateBiayaKuliahRequest'
 *     responses:
 *       200:
 *         description: Biaya kuliah updated
 *   delete:
 *     summary: Delete a biaya kuliah page
 *     tags: [BiayaKuliah]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Biaya kuliah deleted
 */
router.get('/:id', authorize(MENU.BIAYA_KULIAH_MANAGEMENT, ACTION.READ), biayaKuliahController.detail);
router.put(
  '/:id',
  authorize(MENU.BIAYA_KULIAH_MANAGEMENT, ACTION.UPDATE),
  validate(updateBiayaKuliah),
  biayaKuliahController.update
);
router.delete('/:id', authorize(MENU.BIAYA_KULIAH_MANAGEMENT, ACTION.DELETE), biayaKuliahController.remove);

module.exports = router;
