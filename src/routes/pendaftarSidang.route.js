const router = require('express').Router();
const controller = require('../controllers/pendaftarSidang.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createPendaftarSidang, updatePendaftarSidang } = require('../validations/pendaftarSidang.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: PendaftarSidang
 *   description: Master pendaftar sidang skripsi/tugas akhir (modul Prodi) — mahasiswa yang terdaftar pada sebuah jadwal sidang
 */

// Data pendaftar sidang juga ditampilkan (read-only) di menu "Rekap Bimbingan" — dua menu,
// satu tabel yang sama, sama seperti pola Yudisium di BAAK & Prodi.
const READ_CODES = [MENU.PRODI_PENDAFTAR_SIDANG_MANAGEMENT, MENU.PRODI_REKAP_BIMBINGAN_MANAGEMENT];

router.get('/', authorize(READ_CODES, ACTION.READ), controller.list);
router.get('/filter-options', authorize(READ_CODES, ACTION.READ), controller.filterOptions);
router.get('/export', authorize(READ_CODES, ACTION.READ), controller.exportExcel);
router.post(
  '/',
  authorize(MENU.PRODI_PENDAFTAR_SIDANG_MANAGEMENT, ACTION.CREATE),
  validate(createPendaftarSidang),
  controller.create
);
router.get('/:id', authorize(READ_CODES, ACTION.READ), controller.detail);
router.put(
  '/:id',
  authorize(MENU.PRODI_PENDAFTAR_SIDANG_MANAGEMENT, ACTION.UPDATE),
  validate(updatePendaftarSidang),
  controller.update
);
router.delete('/:id', authorize(MENU.PRODI_PENDAFTAR_SIDANG_MANAGEMENT, ACTION.DELETE), controller.remove);

module.exports = router;
