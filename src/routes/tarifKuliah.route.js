const router = require('express').Router();
const controller = require('../controllers/tarifKuliah.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createTarifKuliah, updateTarifKuliah, importTarifKuliah } = require('../validations/tarifKuliah.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: TarifKuliah
 *   description: Master tarif biaya kuliah per prodi, tahun angkatan, dan semester (modul Keuangan)
 */

router.get('/', authorize(MENU.KEUANGAN_TARIF_BIAYA_KULIAH_MANAGEMENT, ACTION.READ), controller.list);
router.post(
  '/',
  authorize(MENU.KEUANGAN_TARIF_BIAYA_KULIAH_MANAGEMENT, ACTION.CREATE),
  validate(createTarifKuliah),
  controller.create
);
router.get('/export', authorize(MENU.KEUANGAN_TARIF_BIAYA_KULIAH_MANAGEMENT, ACTION.READ), controller.exportExcel);
router.get(
  '/import-template',
  authorize(MENU.KEUANGAN_TARIF_BIAYA_KULIAH_MANAGEMENT, ACTION.READ),
  controller.importTemplate
);
router.post(
  '/import',
  authorize(MENU.KEUANGAN_TARIF_BIAYA_KULIAH_MANAGEMENT, ACTION.CREATE),
  validate(importTarifKuliah),
  controller.importExcel
);

router.get('/:id', authorize(MENU.KEUANGAN_TARIF_BIAYA_KULIAH_MANAGEMENT, ACTION.READ), controller.detail);
router.put(
  '/:id',
  authorize(MENU.KEUANGAN_TARIF_BIAYA_KULIAH_MANAGEMENT, ACTION.UPDATE),
  validate(updateTarifKuliah),
  controller.update
);
router.delete('/:id', authorize(MENU.KEUANGAN_TARIF_BIAYA_KULIAH_MANAGEMENT, ACTION.DELETE), controller.remove);

module.exports = router;
