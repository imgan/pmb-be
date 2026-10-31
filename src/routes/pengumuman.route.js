const router = require('express').Router();
const pengumumanController = require('../controllers/pengumuman.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createPengumuman, updatePengumuman } = require('../validations/pengumuman.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);
// Dikelola dari BAAK → Pengumuman dan LMS → Pengumuman (data yang sama, tampil di portal & e-learning).
const KODE_MENU = [MENU.BAAK_PENGUMUMAN_MANAGEMENT, MENU.LMS_PENGUMUMAN_MANAGEMENT];

/**
 * @swagger
 * tags:
 *   name: Pengumuman
 *   description: Pengumuman BAAK untuk portal mahasiswa
 */

/**
 * @swagger
 * /pengumuman:
 *   get:
 *     summary: List pengumuman (paginated, searchable, filter jurusanId)
 *     tags: [Pengumuman]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List of pengumuman
 *   post:
 *     summary: Create a new pengumuman
 *     tags: [Pengumuman]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Pengumuman created
 */
router.get('/', authorize(KODE_MENU, ACTION.READ), pengumumanController.list);
router.post('/', authorize(KODE_MENU, ACTION.CREATE), validate(createPengumuman), pengumumanController.create);

/**
 * @swagger
 * /pengumuman/{id}:
 *   get:
 *     summary: Get pengumuman detail
 *     tags: [Pengumuman]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Pengumuman detail
 *   put:
 *     summary: Update a pengumuman
 *     tags: [Pengumuman]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Pengumuman updated
 *   delete:
 *     summary: Delete a pengumuman (soft delete)
 *     tags: [Pengumuman]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Pengumuman deleted
 */
router.get('/:id', authorize(KODE_MENU, ACTION.READ), pengumumanController.detail);
router.put('/:id', authorize(KODE_MENU, ACTION.UPDATE), validate(updatePengumuman), pengumumanController.update);
router.delete('/:id', authorize(KODE_MENU, ACTION.DELETE), pengumumanController.remove);

module.exports = router;
