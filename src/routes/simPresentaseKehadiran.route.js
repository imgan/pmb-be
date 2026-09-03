const router = require('express').Router();
const controller = require('../controllers/simPresentaseKehadiran.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: SimPresentaseKehadiran
 *   description: Laporan Presentase Kehadiran (modul SIM) — rata-rata kehadiran mahasiswa per program studi, tahun akademik & semester
 */

/**
 * @swagger
 * /sim/presentase-kehadiran:
 *   get:
 *     summary: Rekap rata-rata kehadiran mahasiswa per program studi
 *     tags: [SimPresentaseKehadiran]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: tahun
 *         schema: { type: integer }
 *       - in: query
 *         name: semester
 *         schema: { type: string, enum: [GANJIL, GENAP] }
 *     responses:
 *       200:
 *         description: Rekap presentase kehadiran per program studi
 */
router.get('/', authorize(MENU.SIM_PRESENTASE_KEHADIRAN_MANAGEMENT, ACTION.READ), controller.list);

module.exports = router;
