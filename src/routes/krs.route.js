const router = require('express').Router();
const krsController = require('../controllers/krs.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createKrs, updateKrs } = require('../validations/krs.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Krs
 *   description: Kartu Rencana Studi mahasiswa (modul BAAK)
 */

/**
 * @swagger
 * /krs:
 *   get:
 *     summary: List KRS (paginated, bisa difilter per mahasiswa/tahun ajaran/semester/status)
 *     tags: [Krs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: List of KRS
 *   post:
 *     summary: Create a new KRS (opsional langsung isi daftar kelas kuliah)
 *     tags: [Krs]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: KRS created
 */
const LIST_CODES = [MENU.KRS_MANAGEMENT, MENU.PRODI_MONITORING_FRS_MANAGEMENT];

router.get('/', authorize(LIST_CODES, ACTION.READ), krsController.list);
router.post('/', authorize(MENU.KRS_MANAGEMENT, ACTION.CREATE), validate(createKrs), krsController.create);

/**
 * @swagger
 * /krs/{id}:
 *   get:
 *     summary: Get KRS detail (termasuk daftar kelas kuliah & total SKS)
 *     tags: [Krs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: KRS detail
 *       404:
 *         description: KRS not found
 *   put:
 *     summary: Update KRS (status dan/atau daftar kelas kuliah)
 *     tags: [Krs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: KRS updated
 *   delete:
 *     summary: Delete a KRS
 *     tags: [Krs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: KRS deleted
 */
router.get('/:id', authorize(MENU.KRS_MANAGEMENT, ACTION.READ), krsController.detail);
router.put('/:id', authorize(MENU.KRS_MANAGEMENT, ACTION.UPDATE), validate(updateKrs), krsController.update);
router.delete('/:id', authorize(MENU.KRS_MANAGEMENT, ACTION.DELETE), krsController.remove);

module.exports = router;
