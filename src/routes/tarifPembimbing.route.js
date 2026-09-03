const router = require('express').Router();
const controller = require('../controllers/tarifPembimbing.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createTarifPembimbing,
  updateTarifPembimbing,
  importTarifPembimbing,
} = require('../validations/tarifPembimbing.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: TarifPembimbing
 *   description: Master tarif honor dosen pembimbing (modul Keuangan)
 */

router.get('/', authorize(MENU.KEUANGAN_TARIF_PEMBIMBING_MANAGEMENT, ACTION.READ), controller.list);
router.post(
  '/',
  authorize(MENU.KEUANGAN_TARIF_PEMBIMBING_MANAGEMENT, ACTION.CREATE),
  validate(createTarifPembimbing),
  controller.create
);
router.get('/export', authorize(MENU.KEUANGAN_TARIF_PEMBIMBING_MANAGEMENT, ACTION.READ), controller.exportExcel);
router.get(
  '/import-template',
  authorize(MENU.KEUANGAN_TARIF_PEMBIMBING_MANAGEMENT, ACTION.READ),
  controller.importTemplate
);
router.post(
  '/import',
  authorize(MENU.KEUANGAN_TARIF_PEMBIMBING_MANAGEMENT, ACTION.CREATE),
  validate(importTarifPembimbing),
  controller.importExcel
);

router.get('/:id', authorize(MENU.KEUANGAN_TARIF_PEMBIMBING_MANAGEMENT, ACTION.READ), controller.detail);
router.put(
  '/:id',
  authorize(MENU.KEUANGAN_TARIF_PEMBIMBING_MANAGEMENT, ACTION.UPDATE),
  validate(updateTarifPembimbing),
  controller.update
);
router.delete('/:id', authorize(MENU.KEUANGAN_TARIF_PEMBIMBING_MANAGEMENT, ACTION.DELETE), controller.remove);

module.exports = router;
