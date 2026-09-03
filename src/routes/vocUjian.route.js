const router = require('express').Router();
const controller = require('../controllers/honorUjianPembayaran.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createHonorUjianPembayaran } = require('../validations/honorUjianPembayaran.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: VocUjian
 *   description: Pembayaran honor ujian dosen (modul Keuangan)
 */

router.get('/', authorize(MENU.KEUANGAN_VOC_UJIAN_MANAGEMENT, ACTION.READ), controller.list);
router.post(
  '/',
  authorize(MENU.KEUANGAN_VOC_UJIAN_MANAGEMENT, ACTION.CREATE),
  validate(createHonorUjianPembayaran),
  controller.create
);

module.exports = router;
