const router = require('express').Router();
const controller = require('../controllers/daftarPotongan.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createDaftarPotongan, importDaftarPotongan } = require('../validations/daftarPotongan.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: DaftarPotongan
 *   description: Master daftar potongan biaya kuliah mahasiswa (modul Keuangan)
 */

router.get('/', authorize(MENU.KEUANGAN_DAFTAR_POTONGAN_MANAGEMENT, ACTION.READ), controller.list);
router.post('/', authorize(MENU.KEUANGAN_DAFTAR_POTONGAN_MANAGEMENT, ACTION.CREATE), validate(createDaftarPotongan), controller.create);
router.get('/export', authorize(MENU.KEUANGAN_DAFTAR_POTONGAN_MANAGEMENT, ACTION.READ), controller.exportExcel);
router.get(
  '/import-template',
  authorize(MENU.KEUANGAN_DAFTAR_POTONGAN_MANAGEMENT, ACTION.READ),
  controller.importTemplate
);
router.post(
  '/import',
  authorize(MENU.KEUANGAN_DAFTAR_POTONGAN_MANAGEMENT, ACTION.CREATE),
  validate(importDaftarPotongan),
  controller.importExcel
);

router.get('/:id', authorize(MENU.KEUANGAN_DAFTAR_POTONGAN_MANAGEMENT, ACTION.READ), controller.detail);
router.delete('/:id', authorize(MENU.KEUANGAN_DAFTAR_POTONGAN_MANAGEMENT, ACTION.DELETE), controller.remove);

module.exports = router;
