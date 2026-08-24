const router = require('express').Router();
const controller = require('../controllers/pembimbingTaSkripsi.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createPembimbingTaSkripsi, updatePembimbingTaSkripsi } = require('../validations/pembimbingTaSkripsi.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: PembimbingTaSkripsi
 *   description: Master pembimbing tugas akhir/karya ilmiah/skripsi (modul Prodi) — SK penugasan dosen pembimbing per periode
 */

router.get('/', authorize(MENU.PRODI_PEMBIMBING_TA_SKRIPSI_MANAGEMENT, ACTION.READ), controller.list);
router.get('/filter-options', authorize(MENU.PRODI_PEMBIMBING_TA_SKRIPSI_MANAGEMENT, ACTION.READ), controller.filterOptions);
router.get('/export', authorize(MENU.PRODI_PEMBIMBING_TA_SKRIPSI_MANAGEMENT, ACTION.READ), controller.exportExcel);
router.post(
  '/',
  authorize(MENU.PRODI_PEMBIMBING_TA_SKRIPSI_MANAGEMENT, ACTION.CREATE),
  validate(createPembimbingTaSkripsi),
  controller.create
);
router.get('/:id', authorize(MENU.PRODI_PEMBIMBING_TA_SKRIPSI_MANAGEMENT, ACTION.READ), controller.detail);
router.put(
  '/:id',
  authorize(MENU.PRODI_PEMBIMBING_TA_SKRIPSI_MANAGEMENT, ACTION.UPDATE),
  validate(updatePembimbingTaSkripsi),
  controller.update
);
router.delete('/:id', authorize(MENU.PRODI_PEMBIMBING_TA_SKRIPSI_MANAGEMENT, ACTION.DELETE), controller.remove);

module.exports = router;
