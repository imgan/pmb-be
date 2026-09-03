const router = require('express').Router();
const controller = require('../controllers/simLulusan.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);
router.use(authorize(MENU.SIM_LULUSAN_MANAGEMENT, ACTION.READ));

/**
 * @swagger
 * tags:
 *   name: SimLulusan
 *   description: Laporan Lulusan (modul SIM) — mahasiswa yang sudah yudisium, per tahun lulus & prodi
 */

/**
 * @swagger
 * /sim/lulusan:
 *   get:
 *     summary: List lulusan (mahasiswa yudisium) beserta IPK & lama studi
 *     tags: [SimLulusan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: tahun
 *         schema: { type: integer }
 *       - in: query
 *         name: jurusanId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List lulusan
 */
router.get('/', controller.list);

/**
 * @swagger
 * /sim/lulusan/tahun-lulus-options:
 *   get:
 *     summary: List tahun lulus unik (untuk dropdown filter "Tahun")
 *     tags: [SimLulusan]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of tahun lulus
 */
router.get('/tahun-lulus-options', controller.tahunLulusOptions);

/**
 * @swagger
 * /sim/lulusan/prodi-options:
 *   get:
 *     summary: List program studi (untuk dropdown filter "Prodi")
 *     tags: [SimLulusan]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List prodi
 */
router.get('/prodi-options', controller.prodiOptions);

module.exports = router;
