const router = require('express').Router();
const controller = require('../controllers/vocUjianFtid.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { bayarVocUjianFtid } = require('../validations/vocUjianFtid.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: VocUjianFtid
 *   description: Pembayaran honor ujian dosen FTID (modul Prodi)
 */

router.get('/', authorize(MENU.PRODI_VOC_UJIAN_FTID_MANAGEMENT, ACTION.READ), controller.list);
router.put(
  '/:dosenId/bayar',
  authorize(MENU.PRODI_VOC_UJIAN_FTID_MANAGEMENT, ACTION.UPDATE),
  validate(bayarVocUjianFtid),
  controller.bayar
);

module.exports = router;
