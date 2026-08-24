const router = require('express').Router();
const yudisiumController = require('../controllers/yudisium.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { updateYudisium } = require('../validations/yudisium.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

const READ_CODES = [MENU.YUDISIUM_MANAGEMENT, MENU.PRODI_YUDISIUM_MANAGEMENT];

/**
 * @swagger
 * tags:
 *   name: Yudisium
 *   description: Laporan yudisium mahasiswa (modul BAAK) - read & update saja
 */

/**
 * @swagger
 * /yudisium:
 *   get:
 *     summary: List laporan yudisium (paginated, searchable, bisa difilter per jurusan)
 *     tags: [Yudisium]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List of yudisium
 */
router.get('/', authorize(READ_CODES, ACTION.READ), yudisiumController.list);

/**
 * @swagger
 * /yudisium/{id}:
 *   get:
 *     summary: Get yudisium detail
 *     tags: [Yudisium]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Yudisium detail
 *       404:
 *         description: Yudisium not found
 *   put:
 *     summary: Update a yudisium (No. SK, tanggal SK, tanggal yudisium, PIN, judul, pembimbing)
 *     tags: [Yudisium]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Yudisium updated
 */
router.get('/:id', authorize(READ_CODES, ACTION.READ), yudisiumController.detail);
router.put(
  '/:id',
  authorize(READ_CODES, ACTION.UPDATE),
  validate(updateYudisium),
  yudisiumController.update
);

module.exports = router;
