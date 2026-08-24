const router = require('express').Router();
const mataKuliahController = require('../controllers/mataKuliah.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createMataKuliah, updateMataKuliah } = require('../validations/mataKuliah.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: MataKuliah
 *   description: Master data mata kuliah (modul BAAK)
 */

/**
 * @swagger
 * /mata-kuliah:
 *   get:
 *     summary: List mata kuliah (paginated, searchable)
 *     tags: [MataKuliah]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List of mata kuliah
 *   post:
 *     summary: Create a new mata kuliah
 *     tags: [MataKuliah]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Mata kuliah created
 */
router.get('/', authorize(MENU.MATA_KULIAH_MANAGEMENT, ACTION.READ), mataKuliahController.list);
router.post(
  '/',
  authorize(MENU.MATA_KULIAH_MANAGEMENT, ACTION.CREATE),
  validate(createMataKuliah),
  mataKuliahController.create
);

/**
 * @swagger
 * /mata-kuliah/{id}:
 *   get:
 *     summary: Get mata kuliah detail
 *     tags: [MataKuliah]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Mata kuliah detail
 *       404:
 *         description: Mata kuliah not found
 *   put:
 *     summary: Update a mata kuliah
 *     tags: [MataKuliah]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Mata kuliah updated
 *   delete:
 *     summary: Soft delete a mata kuliah (set isDelete = true)
 *     tags: [MataKuliah]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Mata kuliah deleted
 */
router.get('/:id', authorize(MENU.MATA_KULIAH_MANAGEMENT, ACTION.READ), mataKuliahController.detail);
router.put(
  '/:id',
  authorize(MENU.MATA_KULIAH_MANAGEMENT, ACTION.UPDATE),
  validate(updateMataKuliah),
  mataKuliahController.update
);
router.delete('/:id', authorize(MENU.MATA_KULIAH_MANAGEMENT, ACTION.DELETE), mataKuliahController.remove);

module.exports = router;
