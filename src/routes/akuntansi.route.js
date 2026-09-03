const router = require('express').Router();
const controller = require('../controllers/akuntansi.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Akuntansi
 *   description: Buku Besar & Neraca sederhana sesuai standar PSAK (modul Keuangan)
 */

router.get('/akun', authorize([MENU.KEUANGAN_BUKU_BESAR_MANAGEMENT, MENU.KEUANGAN_NERACA_MANAGEMENT], ACTION.READ), controller.listAkun);
router.get('/buku-besar', authorize(MENU.KEUANGAN_BUKU_BESAR_MANAGEMENT, ACTION.READ), controller.bukuBesar);
router.get('/neraca', authorize(MENU.KEUANGAN_NERACA_MANAGEMENT, ACTION.READ), controller.neraca);

module.exports = router;
