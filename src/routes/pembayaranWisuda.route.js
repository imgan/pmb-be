const router = require('express').Router();
const controller = require('../controllers/pembayaranWisuda.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createPembayaranWisuda } = require('../validations/pembayaranWisuda.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: PembayaranWisuda
 *   description: Transaksi pembayaran biaya wisuda mahasiswa (modul Keuangan)
 */

router.get('/', authorize(MENU.KEUANGAN_PEMBAYARAN_WISUDA_MANAGEMENT, ACTION.READ), controller.list);
router.post(
  '/',
  authorize(MENU.KEUANGAN_PEMBAYARAN_WISUDA_MANAGEMENT, ACTION.CREATE),
  validate(createPembayaranWisuda),
  controller.create
);
router.delete('/:id', authorize(MENU.KEUANGAN_PEMBAYARAN_WISUDA_MANAGEMENT, ACTION.DELETE), controller.remove);

module.exports = router;
