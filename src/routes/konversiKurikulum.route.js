const router = require('express').Router();
const controller = require('../controllers/konversiKurikulum.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { saveKonversi } = require('../validations/konversiKurikulum.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: KonversiKurikulum
 *   description: Konversi mata kuliah antar versi kurikulum (modul Prodi)
 */

router.get(
  '/filter-options',
  authorize(MENU.PRODI_KONVERSI_KURIKULUM_MANAGEMENT, ACTION.READ),
  controller.filterOptions
);
router.get('/', authorize(MENU.PRODI_KONVERSI_KURIKULUM_MANAGEMENT, ACTION.READ), controller.list);
router.post(
  '/',
  authorize(MENU.PRODI_KONVERSI_KURIKULUM_MANAGEMENT, ACTION.UPDATE),
  validate(saveKonversi),
  controller.save
);

module.exports = router;
