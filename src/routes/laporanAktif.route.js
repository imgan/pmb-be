const router = require('express').Router();
const controller = require('../controllers/laporanAktif.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: SimAktif
 *   description: Laporan Aktif (modul SIM) — rekap mahasiswa aktif (KRS) per program studi, SMT, Baru/Pindahan-RPL & Reguler/Karyawan
 */

/**
 * @swagger
 * /sim/aktif:
 *   get:
 *     summary: Rekap mahasiswa aktif per program studi & semester
 *     tags: [SimAktif]
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
 *         description: Rekap mahasiswa aktif dikelompokkan per program studi
 */
router.get('/', authorize(MENU.SIM_AKTIF_MANAGEMENT, ACTION.READ), controller.list);

module.exports = router;
