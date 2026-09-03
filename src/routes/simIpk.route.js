const router = require('express').Router();
const controller = require('../controllers/simIpk.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: SimIpk
 *   description: Laporan IPK (modul SIM) — rata-rata IPK & IPS mahasiswa per program studi, tahun akademik & semester
 */

/**
 * @swagger
 * /sim/ipk:
 *   get:
 *     summary: Rekap rata-rata IPK & IPS mahasiswa per program studi
 *     tags: [SimIpk]
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
 *         description: Rekap IPK & IPS per program studi
 */
router.get('/', authorize(MENU.SIM_IPK_MANAGEMENT, ACTION.READ), controller.list);

module.exports = router;
