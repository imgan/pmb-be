const router = require('express').Router();
const controller = require('../controllers/reportFinger.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: ReportFinger
 *   description: Rekap kehadiran karyawan berdasarkan data sync finger (modul SDI)
 */

router.get('/pdf', authorize(MENU.REPORT_FINGER_MANAGEMENT, ACTION.READ), controller.cetakPdf);

module.exports = router;
