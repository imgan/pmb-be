const router = require('express').Router();
const controller = require('../controllers/kasirDashboard.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: KasirDashboard
 *   description: Dashboard kasir - ringkasan transaksi pembayaran (modul Keuangan)
 */

router.get('/', authorize(MENU.KEUANGAN_DASHBOARD, ACTION.READ), controller.dashboard);

module.exports = router;
