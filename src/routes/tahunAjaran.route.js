const router = require('express').Router();
const tahunAjaranController = require('../controllers/tahunAjaran.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createTahunAjaran, updateTahunAjaran } = require('../validations/tahunAjaran.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: TahunAjaran
 *   description: Master data tahun ajaran (modul BAAK) — dipakai saat generate NIM mahasiswa & pembuatan jadwal kuliah
 */

/**
 * @swagger
 * /tahun-ajaran:
 *   get:
 *     summary: List tahun ajaran (paginated, searchable, filter status aktif)
 *     tags: [TahunAjaran]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List of tahun ajaran
 *   post:
 *     summary: Create a new tahun ajaran
 *     tags: [TahunAjaran]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTahunAjaranRequest'
 *     responses:
 *       201:
 *         description: Tahun ajaran created
 */
router.get('/', authorize(MENU.TAHUN_AJARAN_MANAGEMENT, ACTION.READ), tahunAjaranController.list);
router.post(
  '/',
  authorize(MENU.TAHUN_AJARAN_MANAGEMENT, ACTION.CREATE),
  validate(createTahunAjaran),
  tahunAjaranController.create
);

/**
 * @swagger
 * /tahun-ajaran/{id}:
 *   get:
 *     summary: Get tahun ajaran detail
 *     tags: [TahunAjaran]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Tahun ajaran detail
 *       404:
 *         description: Tahun ajaran not found
 *   put:
 *     summary: Update a tahun ajaran
 *     tags: [TahunAjaran]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTahunAjaranRequest'
 *     responses:
 *       200:
 *         description: Tahun ajaran updated
 *   delete:
 *     summary: Soft delete a tahun ajaran
 *     tags: [TahunAjaran]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Tahun ajaran deleted
 */
router.get('/:id', authorize(MENU.TAHUN_AJARAN_MANAGEMENT, ACTION.READ), tahunAjaranController.detail);
router.put(
  '/:id',
  authorize(MENU.TAHUN_AJARAN_MANAGEMENT, ACTION.UPDATE),
  validate(updateTahunAjaran),
  tahunAjaranController.update
);
router.delete('/:id', authorize(MENU.TAHUN_AJARAN_MANAGEMENT, ACTION.DELETE), tahunAjaranController.remove);

/**
 * @swagger
 * /tahun-ajaran/{id}/aktifkan:
 *   post:
 *     summary: Aktifkan tahun ajaran ini (menonaktifkan tahun ajaran lain) — ini adalah trigger
 *       "naik semester" mahasiswa di sistem ini (semester dihitung otomatis dari periode aktif,
 *       bukan kolom yang di-increment). Mengembalikan laporan mahasiswa yang semester barunya
 *       melebihi batas wajar masa studi untuk ditinjau manual (tidak mengubah status mereka).
 *     tags: [TahunAjaran]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Tahun ajaran diaktifkan
 *       404:
 *         description: Tahun ajaran not found
 */
router.post('/:id/aktifkan', authorize(MENU.TAHUN_AJARAN_MANAGEMENT, ACTION.UPDATE), tahunAjaranController.activate);

module.exports = router;
