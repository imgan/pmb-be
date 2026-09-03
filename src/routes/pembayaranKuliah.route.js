const router = require('express').Router();
const controller = require('../controllers/pembayaranKuliah.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createPembayaranKuliah } = require('../validations/pembayaranKuliah.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: PembayaranKuliah
 *   description: Transaksi pembayaran uang kuliah mahasiswa (modul Keuangan)
 */

router.get('/', authorize(MENU.KEUANGAN_PEMBAYARAN_KULIAH_MANAGEMENT, ACTION.READ), controller.list);
router.post(
  '/',
  authorize(MENU.KEUANGAN_PEMBAYARAN_KULIAH_MANAGEMENT, ACTION.CREATE),
  validate(createPembayaranKuliah),
  controller.create
);
router.delete('/:id', authorize(MENU.KEUANGAN_PEMBAYARAN_KULIAH_MANAGEMENT, ACTION.DELETE), controller.remove);

module.exports = router;
