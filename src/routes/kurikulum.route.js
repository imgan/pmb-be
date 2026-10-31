const router = require('express').Router();
const controller = require('../controllers/kurikulum.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createKurikulum, updateKurikulum, setMatakuliahAktif } = require('../validations/kurikulum.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Kurikulum
 *   description: Kurikulum (header prodi + tahun) yang memiliki banyak mata kuliah (/mata-kuliah)
 */

const READ_KURIKULUM = [
  MENU.PRODI_KURIKULUM_MANAGEMENT,
  MENU.PRODI_MATAKULIAH_AKTIF_MANAGEMENT,
  MENU.PRODI_KONVERSI_KURIKULUM_MANAGEMENT,
  MENU.MATA_KULIAH_MANAGEMENT,
];

/**
 * @swagger
 * /kurikulum:
 *   get:
 *     summary: List kurikulum (filter jurusanId, tahunKurikulum, isActive, search) + jumlah MK & total SKS
 *     tags: [Kurikulum]
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     summary: Tambah kurikulum (prodi + tahun kurikulum, nama default "Kurikulum <tahun> <prodi>")
 *     tags: [Kurikulum]
 *     security: [{ bearerAuth: [] }]
 * /kurikulum/options:
 *   get:
 *     summary: Pilihan kurikulum untuk dropdown (filter jurusanId)
 *     tags: [Kurikulum]
 *     security: [{ bearerAuth: [] }]
 * /kurikulum/tahun-options:
 *   get:
 *     summary: Tahun kurikulum yang tersedia
 *     tags: [Kurikulum]
 *     security: [{ bearerAuth: [] }]
 * /kurikulum/matakuliah-aktif:
 *   get:
 *     summary: Mata kuliah kurikulum + status aktif pada tahun akademik (tahunAjaranId wajib)
 *     tags: [Kurikulum]
 *     security: [{ bearerAuth: [] }]
 *   put:
 *     summary: Aktifkan / nonaktifkan mata kuliah (mataKuliahIds) pada tahun akademik + aktif semester
 *     tags: [Kurikulum]
 *     security: [{ bearerAuth: [] }]
 * /kurikulum/{id}:
 *   get:
 *     summary: Detail kurikulum
 *     tags: [Kurikulum]
 *     security: [{ bearerAuth: [] }]
 *   put:
 *     summary: Ubah kurikulum
 *     tags: [Kurikulum]
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     summary: Hapus kurikulum (hanya bila sudah tidak memiliki mata kuliah)
 *     tags: [Kurikulum]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/', authorize(READ_KURIKULUM, ACTION.READ), controller.list);
router.get('/options', authorize(READ_KURIKULUM, ACTION.READ), controller.options);
router.get('/tahun-options', authorize(READ_KURIKULUM, ACTION.READ), controller.tahunOptions);
// Juga dipakai menu Perkuliahan → Mata Kuliah (lihat saja).
router.get('/matakuliah-aktif', authorize([MENU.PRODI_MATAKULIAH_AKTIF_MANAGEMENT, MENU.PRODI_PERKULIAHAN_MATA_KULIAH_MANAGEMENT], ACTION.READ), controller.listAktif);
router.put(
  '/matakuliah-aktif',
  authorize(MENU.PRODI_MATAKULIAH_AKTIF_MANAGEMENT, ACTION.UPDATE),
  validate(setMatakuliahAktif),
  controller.setAktif
);
router.post('/', authorize(MENU.PRODI_KURIKULUM_MANAGEMENT, ACTION.CREATE), validate(createKurikulum), controller.create);
router.get('/:id', authorize(READ_KURIKULUM, ACTION.READ), controller.detail);
router.put('/:id', authorize(MENU.PRODI_KURIKULUM_MANAGEMENT, ACTION.UPDATE), validate(updateKurikulum), controller.update);
router.delete('/:id', authorize(MENU.PRODI_KURIKULUM_MANAGEMENT, ACTION.DELETE), controller.remove);

module.exports = router;
