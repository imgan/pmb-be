const router = require('express').Router();
const controller = require('../controllers/simRekapitulasiPengajaran.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: SimRekapitulasiPengajaran
 *   description: Rekapitulasi Pengajaran (modul SIM) — rekap jumlah pertemuan mengajar per dosen
 */

/**
 * @swagger
 * /sim/rekapitulasi-pengajaran:
 *   get:
 *     summary: Rekap jumlah pertemuan mengajar per dosen
 *     tags: [SimRekapitulasiPengajaran]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: tahunAjaranId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Rekap pengajaran per dosen
 */
router.get('/', authorize(MENU.SIM_TRANSAKSI_REKAPITULASI_PENGAJARAN_MANAGEMENT, ACTION.READ), controller.list);

module.exports = router;
