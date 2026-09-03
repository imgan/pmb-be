const router = require('express').Router();
const controller = require('../controllers/tunggakanMahasiswa.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createTunggakanMahasiswa,
  updateTunggakanMahasiswa,
  importTunggakanMahasiswa,
} = require('../validations/tunggakanMahasiswa.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: TunggakanMahasiswa
 *   description: Saldo tunggakan pembayaran mahasiswa (modul Keuangan). Dicatat manual sebagai satu saldo per mahasiswa — sistem ini belum punya ledger pembayaran, jadi dipakai terutama untuk import saldo awal tunggakan dari sistem kampus lama.
 */

router.get('/', authorize(MENU.KEUANGAN_TUNGGAKAN_MAHASISWA_MANAGEMENT, ACTION.READ), controller.list);
router.post(
  '/',
  authorize(MENU.KEUANGAN_TUNGGAKAN_MAHASISWA_MANAGEMENT, ACTION.CREATE),
  validate(createTunggakanMahasiswa),
  controller.create
);

router.get('/export', authorize(MENU.KEUANGAN_TUNGGAKAN_MAHASISWA_MANAGEMENT, ACTION.READ), controller.exportExcel);
router.get(
  '/import-template',
  authorize(MENU.KEUANGAN_TUNGGAKAN_MAHASISWA_MANAGEMENT, ACTION.READ),
  controller.importTemplate
);
router.post(
  '/import',
  authorize(MENU.KEUANGAN_TUNGGAKAN_MAHASISWA_MANAGEMENT, ACTION.CREATE),
  validate(importTunggakanMahasiswa),
  controller.importExcel
);

router.get('/:id', authorize(MENU.KEUANGAN_TUNGGAKAN_MAHASISWA_MANAGEMENT, ACTION.READ), controller.detail);
router.put(
  '/:id',
  authorize(MENU.KEUANGAN_TUNGGAKAN_MAHASISWA_MANAGEMENT, ACTION.UPDATE),
  validate(updateTunggakanMahasiswa),
  controller.update
);
router.delete('/:id', authorize(MENU.KEUANGAN_TUNGGAKAN_MAHASISWA_MANAGEMENT, ACTION.DELETE), controller.remove);

module.exports = router;
