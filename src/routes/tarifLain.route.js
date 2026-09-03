const router = require('express').Router();
const controller = require('../controllers/tarifLain.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createTarifLain, updateTarifLain, importTarifLain } = require('../validations/tarifLain.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: TarifLain
 *   description: Master tarif biaya lain-lain (modul Keuangan)
 */

router.get('/', authorize(MENU.KEUANGAN_TARIF_BIAYA_LAIN_MANAGEMENT, ACTION.READ), controller.list);
router.post(
  '/',
  authorize(MENU.KEUANGAN_TARIF_BIAYA_LAIN_MANAGEMENT, ACTION.CREATE),
  validate(createTarifLain),
  controller.create
);
router.get('/export', authorize(MENU.KEUANGAN_TARIF_BIAYA_LAIN_MANAGEMENT, ACTION.READ), controller.exportExcel);
router.get(
  '/import-template',
  authorize(MENU.KEUANGAN_TARIF_BIAYA_LAIN_MANAGEMENT, ACTION.READ),
  controller.importTemplate
);
router.post(
  '/import',
  authorize(MENU.KEUANGAN_TARIF_BIAYA_LAIN_MANAGEMENT, ACTION.CREATE),
  validate(importTarifLain),
  controller.importExcel
);

router.get('/:id', authorize(MENU.KEUANGAN_TARIF_BIAYA_LAIN_MANAGEMENT, ACTION.READ), controller.detail);
router.put(
  '/:id',
  authorize(MENU.KEUANGAN_TARIF_BIAYA_LAIN_MANAGEMENT, ACTION.UPDATE),
  validate(updateTarifLain),
  controller.update
);
router.delete('/:id', authorize(MENU.KEUANGAN_TARIF_BIAYA_LAIN_MANAGEMENT, ACTION.DELETE), controller.remove);

module.exports = router;
