const router = require('express').Router();
const beasiswaController = require('../controllers/beasiswa.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createBeasiswa, updateBeasiswa } = require('../validations/beasiswa.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Beasiswa
 *   description: Konten halaman beasiswa yang tampil di website publik (mis. KIP Kuliah)
 */

/**
 * @swagger
 * /beasiswa:
 *   get:
 *     summary: List beasiswa (paginated, searchable)
 *     tags: [Beasiswa]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List of beasiswa
 *   post:
 *     summary: Create a new beasiswa page
 *     tags: [Beasiswa]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBeasiswaRequest'
 *     responses:
 *       201:
 *         description: Beasiswa created
 */
router.get('/', authorize(MENU.BEASISWA_MANAGEMENT, ACTION.READ), beasiswaController.list);
router.post('/', authorize(MENU.BEASISWA_MANAGEMENT, ACTION.CREATE), validate(createBeasiswa), beasiswaController.create);

/**
 * @swagger
 * /beasiswa/{id}:
 *   get:
 *     summary: Get beasiswa detail
 *     tags: [Beasiswa]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Beasiswa detail
 *       404:
 *         description: Beasiswa not found
 *   put:
 *     summary: Update a beasiswa page
 *     tags: [Beasiswa]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateBeasiswaRequest'
 *     responses:
 *       200:
 *         description: Beasiswa updated
 *   delete:
 *     summary: Delete a beasiswa page
 *     tags: [Beasiswa]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Beasiswa deleted
 */
router.get('/:id', authorize(MENU.BEASISWA_MANAGEMENT, ACTION.READ), beasiswaController.detail);
router.put('/:id', authorize(MENU.BEASISWA_MANAGEMENT, ACTION.UPDATE), validate(updateBeasiswa), beasiswaController.update);
router.delete('/:id', authorize(MENU.BEASISWA_MANAGEMENT, ACTION.DELETE), beasiswaController.remove);

module.exports = router;
