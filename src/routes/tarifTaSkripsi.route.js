const router = require('express').Router();
const controller = require('../controllers/tarifTaSkripsi.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createTarifTaSkripsi,
  updateTarifTaSkripsi,
  importTarifTaSkripsi,
} = require('../validations/tarifTaSkripsi.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: TarifTaSkripsi
 *   description: Master tarif biaya tugas akhir/skripsi (modul Keuangan)
 */

router.get('/', authorize(MENU.KEUANGAN_TARIF_TA_SKRIPSI_MANAGEMENT, ACTION.READ), controller.list);
router.post(
  '/',
  authorize(MENU.KEUANGAN_TARIF_TA_SKRIPSI_MANAGEMENT, ACTION.CREATE),
  validate(createTarifTaSkripsi),
  controller.create
);
router.get('/export', authorize(MENU.KEUANGAN_TARIF_TA_SKRIPSI_MANAGEMENT, ACTION.READ), controller.exportExcel);
router.get(
  '/import-template',
  authorize(MENU.KEUANGAN_TARIF_TA_SKRIPSI_MANAGEMENT, ACTION.READ),
  controller.importTemplate
);
router.post(
  '/import',
  authorize(MENU.KEUANGAN_TARIF_TA_SKRIPSI_MANAGEMENT, ACTION.CREATE),
  validate(importTarifTaSkripsi),
  controller.importExcel
);

router.get('/:id', authorize(MENU.KEUANGAN_TARIF_TA_SKRIPSI_MANAGEMENT, ACTION.READ), controller.detail);
router.put(
  '/:id',
  authorize(MENU.KEUANGAN_TARIF_TA_SKRIPSI_MANAGEMENT, ACTION.UPDATE),
  validate(updateTarifTaSkripsi),
  controller.update
);
router.delete('/:id', authorize(MENU.KEUANGAN_TARIF_TA_SKRIPSI_MANAGEMENT, ACTION.DELETE), controller.remove);

module.exports = router;
