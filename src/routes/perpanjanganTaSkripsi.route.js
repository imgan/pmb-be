const router = require('express').Router();
const controller = require('../controllers/perpanjanganTaSkripsi.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createPerpanjangan } = require('../validations/perpanjanganTaSkripsi.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: PerpanjanganTaSkripsi
 *   description: Transaksi perpanjangan masa TA/Skripsi mahasiswa (modul Keuangan)
 */

router.get('/', authorize(MENU.KEUANGAN_PERPANJANGAN_TA_SKRIPSI_MANAGEMENT, ACTION.READ), controller.list);
router.get('/tarif', authorize(MENU.KEUANGAN_PERPANJANGAN_TA_SKRIPSI_MANAGEMENT, ACTION.READ), controller.tarif);
router.post(
  '/',
  authorize(MENU.KEUANGAN_PERPANJANGAN_TA_SKRIPSI_MANAGEMENT, ACTION.CREATE),
  validate(createPerpanjangan),
  controller.create
);
router.delete('/:id', authorize(MENU.KEUANGAN_PERPANJANGAN_TA_SKRIPSI_MANAGEMENT, ACTION.DELETE), controller.remove);

module.exports = router;
