const router = require('express').Router();
const tesUjianController = require('../controllers/tesUjian.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createTesUjian, updateTesUjian, tambahPeserta, setNilai, koreksiEssay } = require('../validations/tesUjian.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: TesUjian
 *   description: Tes ujian seleksi PMB per gelombang + peserta yang berhak ujian dan nilainya
 */

/**
 * @swagger
 * /tes-ujian:
 *   get:
 *     summary: List tes ujian (paginated, searchable, filter gelombangId)
 *     tags: [TesUjian]
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     summary: Create tes ujian
 *     tags: [TesUjian]
 *     security: [{ bearerAuth: [] }]
 */
const M = MENU.TES_UJIAN_MANAGEMENT;
router.get('/', authorize(M, ACTION.READ), tesUjianController.list);
router.post('/', authorize(M, ACTION.CREATE), validate(createTesUjian), tesUjianController.create);

/**
 * @swagger
 * /tes-ujian/{id}:
 *   get:
 *     summary: Detail tes ujian
 *     tags: [TesUjian]
 *     security: [{ bearerAuth: [] }]
 *   put:
 *     summary: Update tes ujian
 *     tags: [TesUjian]
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     summary: Delete tes ujian (peserta ujiannya ikut terhapus)
 *     tags: [TesUjian]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/:id', authorize(M, ACTION.READ), tesUjianController.detail);
router.put('/:id', authorize(M, ACTION.UPDATE), validate(updateTesUjian), tesUjianController.update);
router.delete('/:id', authorize(M, ACTION.DELETE), tesUjianController.remove);

// Daftar Peserta: peserta ujian, kandidat popup Tambah Peserta (dengan status kelengkapan dokumen), set nilai, batalkan.
router.get('/:id/peserta', authorize(M, ACTION.READ), tesUjianController.listPeserta);
router.get('/:id/kandidat', authorize(M, ACTION.READ), tesUjianController.listKandidat);
router.post('/:id/peserta', authorize(M, ACTION.UPDATE), validate(tambahPeserta), tesUjianController.tambahPeserta);
router.put('/:id/peserta/:pesertaUjianId', authorize(M, ACTION.UPDATE), validate(setNilai), tesUjianController.setNilai);
// Koreksi: jawaban soal online peserta, skor essay diisi admin → nilai dihitung ulang.
router.get('/:id/peserta/:pesertaUjianId/koreksi', authorize(M, ACTION.READ), tesUjianController.getKoreksi);
router.put('/:id/peserta/:pesertaUjianId/koreksi', authorize(M, ACTION.UPDATE), validate(koreksiEssay), tesUjianController.simpanKoreksi);
router.delete('/:id/peserta/:pesertaUjianId', authorize(M, ACTION.UPDATE), tesUjianController.batalkanPeserta);

module.exports = router;
