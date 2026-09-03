const router = require('express').Router();
const controller = require('../controllers/simKehadiranKelas.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: SimKehadiranKelas
 *   description: Laporan Kehadiran Kelas (modul SIM) — rata-rata kehadiran mahasiswa per kelas, tahun & semester
 */

/**
 * @swagger
 * /sim/kehadiran-kelas:
 *   get:
 *     summary: Rekap rata-rata kehadiran mahasiswa per kelas (mata kuliah)
 *     tags: [SimKehadiranKelas]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: tahun
 *         schema: { type: integer }
 *       - in: query
 *         name: semester
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Rekap kehadiran per kelas
 */
router.get('/', authorize(MENU.SIM_KEHADIRAN_KELAS_MANAGEMENT, ACTION.READ), controller.list);

module.exports = router;
