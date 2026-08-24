const router = require('express').Router();
const controller = require('../controllers/vocDosenFtid.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { updateVocUjianDosen } = require('../validations/vocDosenFtid.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: VocDosenFtid
 *   description: Voucher pembuatan soal, koreksi, dan pengawasan UAS untuk dosen FTID (modul Prodi)
 */

router.get('/', authorize(MENU.PRODI_VOC_DOSEN_FTID_MANAGEMENT, ACTION.READ), controller.list);
router.get('/:dosenId/detail', authorize(MENU.PRODI_VOC_DOSEN_FTID_MANAGEMENT, ACTION.READ), controller.detail);
router.get('/:dosenId/pdf', authorize(MENU.PRODI_VOC_DOSEN_FTID_MANAGEMENT, ACTION.READ), controller.cetakPdf);
router.put(
  '/jadwal/:jadwalKuliahId',
  authorize(MENU.PRODI_VOC_DOSEN_FTID_MANAGEMENT, ACTION.UPDATE),
  validate(updateVocUjianDosen),
  controller.updateJadwal
);

module.exports = router;
