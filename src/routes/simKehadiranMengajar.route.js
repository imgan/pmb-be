const router = require('express').Router();
const controller = require('../controllers/simKehadiranMengajar.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: SimKehadiranMengajar
 *   description: Cetak Kehadiran Mengajar (modul SIM) — daftar realisasi mengajar dosen
 */

/**
 * @swagger
 * /sim/kehadiran-mengajar:
 *   get:
 *     summary: List realisasi kehadiran mengajar dosen
 *     tags: [SimKehadiranMengajar]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: tahunAjaranId
 *         schema: { type: integer }
 *       - in: query
 *         name: dosenId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List realisasi kehadiran mengajar
 */
router.get('/', authorize(MENU.SIM_TRANSAKSI_CETAK_KEHADIRAN_MENGAJAR_MANAGEMENT, ACTION.READ), controller.list);

module.exports = router;
