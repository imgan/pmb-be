const router = require('express').Router();
const calonMahasiswaController = require('../controllers/calonMahasiswa.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createCalonMahasiswa, updateCalonMahasiswa } = require('../validations/calonMahasiswa.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: CalonMahasiswa
 *   description: Data calon mahasiswa baru & status kelengkapan pendaftaran/beasiswa
 */

/**
 * @swagger
 * /calon-mahasiswa/stats:
 *   get:
 *     summary: Ringkasan statistik calon mahasiswa (total pendaftar, diterima, ditolak, jalur beasiswa, beasiswa diterima)
 *     tags: [CalonMahasiswa]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Statistik calon mahasiswa
 */
router.get('/stats', authorize(MENU.CALON_MAHASISWA_MANAGEMENT, ACTION.READ), calonMahasiswaController.stats);

/**
 * @swagger
 * /calon-mahasiswa:
 *   get:
 *     summary: List calon mahasiswa (paginated, searchable, bisa difilter status kuliah / skema pembiayaan)
 *     tags: [CalonMahasiswa]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List of calon mahasiswa
 *   post:
 *     summary: Create a new calon mahasiswa record
 *     tags: [CalonMahasiswa]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCalonMahasiswaRequest'
 *     responses:
 *       201:
 *         description: Calon mahasiswa created
 */
router.get('/', authorize(MENU.CALON_MAHASISWA_MANAGEMENT, ACTION.READ), calonMahasiswaController.list);
router.post(
  '/',
  authorize(MENU.CALON_MAHASISWA_MANAGEMENT, ACTION.CREATE),
  validate(createCalonMahasiswa),
  calonMahasiswaController.create
);

/**
 * @swagger
 * /calon-mahasiswa/{id}:
 *   get:
 *     summary: Get calon mahasiswa detail
 *     tags: [CalonMahasiswa]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Calon mahasiswa detail
 *       404:
 *         description: Calon mahasiswa not found
 *   put:
 *     summary: Update a calon mahasiswa record
 *     tags: [CalonMahasiswa]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCalonMahasiswaRequest'
 *     responses:
 *       200:
 *         description: Calon mahasiswa updated
 *   delete:
 *     summary: Delete a calon mahasiswa record
 *     tags: [CalonMahasiswa]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Calon mahasiswa deleted
 */
router.get('/:id', authorize(MENU.CALON_MAHASISWA_MANAGEMENT, ACTION.READ), calonMahasiswaController.detail);
router.put(
  '/:id',
  authorize(MENU.CALON_MAHASISWA_MANAGEMENT, ACTION.UPDATE),
  validate(updateCalonMahasiswa),
  calonMahasiswaController.update
);
router.delete('/:id', authorize(MENU.CALON_MAHASISWA_MANAGEMENT, ACTION.DELETE), calonMahasiswaController.remove);

module.exports = router;
