const router = require('express').Router();
const controller = require('../controllers/pembayaranTaSkripsi.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createPembayaran } = require('../validations/pembayaranTaSkripsi.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: PembayaranTaSkripsi
 *   description: Transaksi pembayaran pendaftaran TA/Skripsi mahasiswa (modul Keuangan)
 */

router.get('/', authorize(MENU.KEUANGAN_PEMBAYARAN_TA_SKRIPSI_MANAGEMENT, ACTION.READ), controller.list);
router.get('/tarif', authorize(MENU.KEUANGAN_PEMBAYARAN_TA_SKRIPSI_MANAGEMENT, ACTION.READ), controller.tarif);
router.post(
  '/',
  authorize(MENU.KEUANGAN_PEMBAYARAN_TA_SKRIPSI_MANAGEMENT, ACTION.CREATE),
  validate(createPembayaran),
  controller.create
);
router.delete('/:id', authorize(MENU.KEUANGAN_PEMBAYARAN_TA_SKRIPSI_MANAGEMENT, ACTION.DELETE), controller.remove);

module.exports = router;
