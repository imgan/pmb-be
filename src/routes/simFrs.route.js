const router = require('express').Router();
const controller = require('../controllers/simFrs.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: SimFrs
 *   description: Laporan FRS (modul SIM) — rekap jumlah KRS Reguler vs Pindahan/RPL per program studi, tahun akademik & semester
 */

/**
 * @swagger
 * /sim/frs:
 *   get:
 *     summary: Rekap jumlah FRS (KRS) per program studi
 *     tags: [SimFrs]
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
 *         description: Rekap FRS per program studi
 */
router.get('/', authorize(MENU.SIM_FRS_MANAGEMENT, ACTION.READ), controller.list);

module.exports = router;
