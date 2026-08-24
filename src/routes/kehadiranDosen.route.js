const router = require('express').Router();
const kehadiranDosenController = require('../controllers/kehadiranDosen.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createKehadiranDosen, updateKehadiranDosen } = require('../validations/kehadiranDosen.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: KehadiranDosen
 *   description: Master monitoring kehadiran (realisasi mengajar) dosen (modul BAAK)
 */

/**
 * @swagger
 * /kehadiran-dosen:
 *   get:
 *     summary: List kehadiran dosen (paginated, searchable, bisa difilter per kelas/status)
 *     tags: [KehadiranDosen]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List of kehadiran dosen
 *   post:
 *     summary: Create a new kehadiran dosen
 *     tags: [KehadiranDosen]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Kehadiran dosen created
 */
router.get('/', authorize(MENU.KEHADIRAN_DOSEN_MANAGEMENT, ACTION.READ), kehadiranDosenController.list);
router.post(
  '/',
  authorize(MENU.KEHADIRAN_DOSEN_MANAGEMENT, ACTION.CREATE),
  validate(createKehadiranDosen),
  kehadiranDosenController.create
);

/**
 * @swagger
 * /kehadiran-dosen/status-summary:
 *   get:
 *     summary: Ringkasan jumlah kehadiran dosen per status (untuk grafik dashboard)
 *     tags: [KehadiranDosen]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Ringkasan per status
 */
router.get(
  '/status-summary',
  authorize([MENU.KEHADIRAN_DOSEN_MANAGEMENT, MENU.BAAK_DASHBOARD], ACTION.READ),
  kehadiranDosenController.statusSummary
);

/**
 * @swagger
 * /kehadiran-dosen/{id}:
 *   get:
 *     summary: Get kehadiran dosen detail
 *     tags: [KehadiranDosen]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Kehadiran dosen detail
 *       404:
 *         description: Kehadiran dosen not found
 *   put:
 *     summary: Update a kehadiran dosen
 *     tags: [KehadiranDosen]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Kehadiran dosen updated
 *   delete:
 *     summary: Soft delete a kehadiran dosen (set isDelete = true)
 *     tags: [KehadiranDosen]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Kehadiran dosen deleted
 */
router.get('/:id', authorize(MENU.KEHADIRAN_DOSEN_MANAGEMENT, ACTION.READ), kehadiranDosenController.detail);
router.put(
  '/:id',
  authorize(MENU.KEHADIRAN_DOSEN_MANAGEMENT, ACTION.UPDATE),
  validate(updateKehadiranDosen),
  kehadiranDosenController.update
);
router.delete('/:id', authorize(MENU.KEHADIRAN_DOSEN_MANAGEMENT, ACTION.DELETE), kehadiranDosenController.remove);

module.exports = router;
