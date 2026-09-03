const router = require('express').Router();
const controller = require('../controllers/pembayaranLain.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createPembayaran } = require('../validations/pembayaranLain.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: PembayaranLain
 *   description: Transaksi pembayaran biaya lain (master Tarif Biaya Lain) mahasiswa (modul Keuangan)
 */

// Gated di bawah permission Pembayaran Kuliah — fitur ini adalah perluasan dropdown "tagihan
// lain" di halaman Pembayaran Kuliah (lihat pmb-fe PembayaranKuliahView.vue), bukan menu
// transaksi tersendiri, jadi tidak dibuatkan menu/permission terpisah.
router.get('/', authorize(MENU.KEUANGAN_PEMBAYARAN_KULIAH_MANAGEMENT, ACTION.READ), controller.list);
router.get('/ringkasan', authorize(MENU.KEUANGAN_PEMBAYARAN_KULIAH_MANAGEMENT, ACTION.READ), controller.ringkasan);
router.post('/', authorize(MENU.KEUANGAN_PEMBAYARAN_KULIAH_MANAGEMENT, ACTION.CREATE), validate(createPembayaran), controller.create);
router.delete('/:id', authorize(MENU.KEUANGAN_PEMBAYARAN_KULIAH_MANAGEMENT, ACTION.DELETE), controller.remove);

module.exports = router;
