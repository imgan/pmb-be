const router = require('express').Router();
const controller = require('../controllers/simStudentBody.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: SimStudentBody
 *   description: Laporan Student Body (modul SIM) — rekap mahasiswa terdaftar, lulus, dan keluar/DO per program studi & tahun masuk
 */

/**
 * @swagger
 * /sim/student-body:
 *   get:
 *     summary: Rekap Student Body per program studi & tahun masuk
 *     tags: [SimStudentBody]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Rekap student body dikelompokkan per program studi
 */
router.get('/', authorize(MENU.SIM_STUDENT_BODY_MANAGEMENT, ACTION.READ), controller.list);

module.exports = router;
