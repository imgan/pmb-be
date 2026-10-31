const router = require('express').Router();
const controller = require('../controllers/mataKuliah.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createMataKuliah, updateMataKuliah, importMataKuliah, settingKurikulum } = require('../validations/mataKuliah.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: MataKuliah
 *   description: Mata kuliah milik kurikulum (Kurikulum 1 ── N MataKuliah); dikelola dari Prodi → Kurikulum
 */

// Dikelola dari Prodi → Master Kurikulum (detail) & master Mata Kuliah BAAK.
const MANAGE = [MENU.PRODI_KURIKULUM_MANAGEMENT, MENU.MATA_KULIAH_MANAGEMENT];
const READ = [...MANAGE, MENU.PRODI_MATAKULIAH_AKTIF_MANAGEMENT, MENU.PRODI_KONVERSI_KURIKULUM_MANAGEMENT];

/**
 * @swagger
 * /mata-kuliah:
 *   get:
 *     summary: List mata kuliah (filter kurikulumId, jurusanId, tahunKurikulum, semester, search)
 *     tags: [MataKuliah]
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     summary: Tambah mata kuliah ke satu kurikulum (kurikulumId wajib)
 *     tags: [MataKuliah]
 *     security: [{ bearerAuth: [] }]
 * /mata-kuliah/export:
 *   get:
 *     summary: Export Excel format Neo Feeder (filter sama dengan list)
 *     tags: [MataKuliah]
 *     security: [{ bearerAuth: [] }]
 * /mata-kuliah/import-template:
 *   get:
 *     summary: Template import Excel format Neo Feeder
 *     tags: [MataKuliah]
 *     security: [{ bearerAuth: [] }]
 * /mata-kuliah/import:
 *   post:
 *     summary: Import Excel (kurikulum dari Kode Prodi + Kurikulum, dibuat otomatis; atau kurikulumId)
 *     tags: [MataKuliah]
 *     security: [{ bearerAuth: [] }]
 * /mata-kuliah/{id}:
 *   get:
 *     summary: Detail mata kuliah
 *     tags: [MataKuliah]
 *     security: [{ bearerAuth: [] }]
 *   put:
 *     summary: Ubah mata kuliah
 *     tags: [MataKuliah]
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     summary: Hapus mata kuliah (soft delete)
 *     tags: [MataKuliah]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/', authorize(READ, ACTION.READ), controller.list);
router.post('/', authorize(MANAGE, ACTION.CREATE), validate(createMataKuliah), controller.create);
router.get('/export', authorize(READ, ACTION.READ), controller.exportExcel);
router.get('/import-template', authorize(MANAGE, ACTION.READ), controller.importTemplate);
router.post('/import', authorize(MANAGE, ACTION.CREATE), validate(importMataKuliah), controller.importExcel);
/**
 * @swagger
 * /mata-kuliah/setting-kurikulum:
 *   put:
 *     summary: Setting Kurikulum — OBE & target CPL/CPMK banyak mata kuliah satu kurikulum sekaligus
 *     tags: [MataKuliah]
 *     security: [{ bearerAuth: [] }]
 */
router.put('/setting-kurikulum', authorize(MANAGE, ACTION.UPDATE), validate(settingKurikulum), controller.settingKurikulum);
router.get('/:id', authorize(READ, ACTION.READ), controller.detail);
router.put('/:id', authorize(MANAGE, ACTION.UPDATE), validate(updateMataKuliah), controller.update);
router.delete('/:id', authorize(MANAGE, ACTION.DELETE), controller.remove);

module.exports = router;
