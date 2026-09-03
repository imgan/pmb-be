const router = require('express').Router();
const controller = require('../controllers/simNilaiDE.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: SimNilaiDE
 *   description: Laporan Nilai D & E (modul SIM) — rekap mahasiswa dengan nilai D/E per mata kuliah & program studi
 */

/**
 * @swagger
 * /sim/nilai-d-e:
 *   get:
 *     summary: Rekap jumlah nilai D & E per mata kuliah
 *     tags: [SimNilaiDE]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: prodi
 *         schema: { type: string }
 *       - in: query
 *         name: kodeMataKuliah
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Rekap nilai D & E per program studi & mata kuliah
 */
router.get('/', authorize(MENU.SIM_NILAI_D_E_MANAGEMENT, ACTION.READ), controller.list);

module.exports = router;
