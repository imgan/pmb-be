const router = require('express').Router();
const controller = require('../controllers/simLaporanUjian.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: SimLaporanUjian
 *   description: Laporan Kehadiran Ujian (modul SIM) — jumlah kehadiran ujian UTS/UAS mahasiswa per program studi & tahun akademik
 */

/**
 * @swagger
 * /sim/ujian:
 *   get:
 *     summary: Rekap jumlah kehadiran ujian per program studi
 *     tags: [SimLaporanUjian]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: tahun
 *         schema: { type: integer }
 *       - in: query
 *         name: jenisUjian
 *         schema: { type: string, enum: [UTS, UAS] }
 *     responses:
 *       200:
 *         description: Rekap kehadiran ujian per program studi
 */
router.get('/', authorize(MENU.SIM_UJIAN_MANAGEMENT, ACTION.READ), controller.list);

module.exports = router;
