const router = require('express').Router();
const controller = require('../controllers/pembayaranSertifikasi.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createPembayaranSertifikasi, updatePembayaranSertifikasi } = require('../validations/pembayaranSertifikasi.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: PembayaranSertifikasi
 *   description: Transaksi pembayaran sertifikasi mahasiswa (modul Keuangan)
 */

router.get('/', authorize(MENU.KEUANGAN_PEMBAYARAN_SERTIFIKASI_MANAGEMENT, ACTION.READ), controller.list);
router.post(
  '/',
  authorize(MENU.KEUANGAN_PEMBAYARAN_SERTIFIKASI_MANAGEMENT, ACTION.CREATE),
  validate(createPembayaranSertifikasi),
  controller.create
);
router.get('/:id', authorize(MENU.KEUANGAN_PEMBAYARAN_SERTIFIKASI_MANAGEMENT, ACTION.READ), controller.detail);
router.put(
  '/:id',
  authorize(MENU.KEUANGAN_PEMBAYARAN_SERTIFIKASI_MANAGEMENT, ACTION.UPDATE),
  validate(updatePembayaranSertifikasi),
  controller.update
);
router.delete('/:id', authorize(MENU.KEUANGAN_PEMBAYARAN_SERTIFIKASI_MANAGEMENT, ACTION.DELETE), controller.remove);

module.exports = router;
