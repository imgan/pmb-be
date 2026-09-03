const router = require('express').Router();
const controller = require('../controllers/kurikulum.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createKurikulum, updateKurikulum, importKurikulum } = require('../validations/kurikulum.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Kurikulum
 *   description: Master kurikulum / mata kuliah (modul Prodi)
 */

router.get('/', authorize(MENU.PRODI_KURIKULUM_MANAGEMENT, ACTION.READ), controller.list);
router.get(
  '/matakuliah-aktif',
  authorize(MENU.PRODI_MATAKULIAH_AKTIF_MANAGEMENT, ACTION.READ),
  controller.listAktif
);
router.post('/', authorize(MENU.PRODI_KURIKULUM_MANAGEMENT, ACTION.CREATE), validate(createKurikulum), controller.create);
router.get('/export', authorize(MENU.PRODI_KURIKULUM_MANAGEMENT, ACTION.READ), controller.exportExcel);
router.get('/import-template', authorize(MENU.PRODI_KURIKULUM_MANAGEMENT, ACTION.READ), controller.importTemplate);
router.post(
  '/import',
  authorize(MENU.PRODI_KURIKULUM_MANAGEMENT, ACTION.CREATE),
  validate(importKurikulum),
  controller.importExcel
);
router.get('/:id', authorize(MENU.PRODI_KURIKULUM_MANAGEMENT, ACTION.READ), controller.detail);
router.put('/:id', authorize(MENU.PRODI_KURIKULUM_MANAGEMENT, ACTION.UPDATE), validate(updateKurikulum), controller.update);
router.delete('/:id', authorize(MENU.PRODI_KURIKULUM_MANAGEMENT, ACTION.DELETE), controller.remove);

module.exports = router;
