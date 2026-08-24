const router = require('express').Router();
const prodiLulusanController = require('../controllers/prodiLulusan.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: ProdiLulusan
 *   description: Master data lulusan (read-only, modul Prodi)
 */

/**
 * @swagger
 * /prodi/lulusan:
 *   get:
 *     summary: List mahasiswa yang sudah yudisium (lulus), beserta total SKS & IPK
 *     tags: [ProdiLulusan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List lulusan
 */
router.get('/', authorize(MENU.PRODI_LULUSAN_MANAGEMENT, ACTION.READ), prodiLulusanController.list);

/**
 * @swagger
 * /prodi/lulusan/tahun-lulus-options:
 *   get:
 *     summary: List tahun lulus unik (untuk dropdown filter "Tahun Lulus")
 *     tags: [ProdiLulusan]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of tahun lulus
 */
router.get(
  '/tahun-lulus-options',
  authorize(MENU.PRODI_LULUSAN_MANAGEMENT, ACTION.READ),
  prodiLulusanController.tahunLulusOptions
);

module.exports = router;
