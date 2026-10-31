const router = require('express').Router();
const controller = require('../controllers/tagihanKuliah.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { generateTagihan, importTagihan, updateTagihan, saveCicilan, generateCicilan } = require('../validations/tagihanKuliah.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: TagihanKuliah
 *   description: Generate Tagihan (modul Keuangan) — generate & lihat tagihan kuliah mahasiswa per tahun ajaran
 */

const canRead = authorize(MENU.KEUANGAN_GENERATE_TAGIHAN_MANAGEMENT, ACTION.READ);
const canImport = authorize(MENU.KEUANGAN_GENERATE_TAGIHAN_MANAGEMENT, ACTION.CREATE);

/**
 * @swagger
 * /keuangan/generate-tagihan/import/preview:
 *   post:
 *     summary: Validasi file Excel tagihan & tampilkan perbandingan (BARU/UBAH/TETAP/GAGAL) tanpa menyimpan
 *     tags: [TagihanKuliah]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { file: { type: string, description: base64 .xlsx } } }
 * /keuangan/generate-tagihan/import:
 *   post:
 *     summary: Proses import tagihan (upsert per NIM + periode, dicatat sebagai batch + log audit)
 *     tags: [TagihanKuliah]
 *     security: [{ bearerAuth: [] }]
 * /keuangan/generate-tagihan/import/template:
 *   get:
 *     summary: Download template Excel import tagihan
 *     tags: [TagihanKuliah]
 *     security: [{ bearerAuth: [] }]
 * /keuangan/generate-tagihan/import/riwayat:
 *   get:
 *     summary: Riwayat proses import tagihan
 *     tags: [TagihanKuliah]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/import/preview', canImport, validate(importTagihan), controller.importPreview);
router.post('/import', canImport, validate(importTagihan), controller.importCommit);
router.get('/import/template', canRead, controller.importTemplate);
router.get('/import/riwayat', canRead, controller.importRiwayat);
router.get('/import/riwayat/:id', canRead, controller.importRiwayatDetail);

/**
 * @swagger
 * /keuangan/generate-tagihan/import-va/preview:
 *   post:
 *     summary: Validasi file VA bank (No VA, Nim, periode_open, periode_close, Tagihan) tanpa menyimpan
 *     tags: [TagihanKuliah]
 *     security: [{ bearerAuth: [] }]
 * /keuangan/generate-tagihan/import-va:
 *   post:
 *     summary: Proses import VA (upsert per NIM + periode_open)
 *     tags: [TagihanKuliah]
 *     security: [{ bearerAuth: [] }]
 * /keuangan/generate-tagihan/import-va/template:
 *   get:
 *     summary: Download template Excel import VA
 *     tags: [TagihanKuliah]
 *     security: [{ bearerAuth: [] }]
 * /keuangan/generate-tagihan/va-mahasiswa/{mahasiswaId}:
 *   get:
 *     summary: Semua VA satu mahasiswa (per periode)
 *     tags: [TagihanKuliah]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/import-va/preview', canImport, validate(importTagihan), controller.importVaPreview);
router.post('/import-va', canImport, validate(importTagihan), controller.importVaCommit);
router.get('/import-va/template', canRead, controller.importVaTemplate);
router.get('/va-mahasiswa/:mahasiswaId', canRead, controller.vaMahasiswa);

router.get('/', authorize(MENU.KEUANGAN_GENERATE_TAGIHAN_MANAGEMENT, ACTION.READ), controller.list);
router.get('/cari', authorize(MENU.KEUANGAN_GENERATE_TAGIHAN_MANAGEMENT, ACTION.READ), controller.cariByNim);
// Export Excel daftar tagihan (filter sama dengan daftar: tahunAjaranId, search, status).
router.get('/export', authorize(MENU.KEUANGAN_GENERATE_TAGIHAN_MANAGEMENT, ACTION.READ), controller.exportExcel);
// Riwayat pembayaran satu mahasiswa (semua semester + transaksi kasir).
router.get('/riwayat-mahasiswa/:mahasiswaId', authorize(MENU.KEUANGAN_GENERATE_TAGIHAN_MANAGEMENT, ACTION.READ), controller.riwayatMahasiswa);
/**
 * @swagger
 * /keuangan/generate-tagihan/cicilan/generate:
 *   post:
 *     summary: Buat cicilan bulanan sekaligus untuk semua tagihan satu tahun akademik (opsional per prodi)
 *     tags: [TagihanKuliah]
 *     security: [{ bearerAuth: [] }]
 * /keuangan/generate-tagihan/{id}/cicilan:
 *   get:
 *     summary: Cicilan bulanan satu tagihan beserta status bayar per cicilan
 *     tags: [TagihanKuliah]
 *     security: [{ bearerAuth: [] }]
 *   put:
 *     summary: Simpan (ganti seluruh) cicilan satu tagihan; array kosong = hapus cicilan
 *     tags: [TagihanKuliah]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/cicilan/generate', authorize(MENU.KEUANGAN_GENERATE_TAGIHAN_MANAGEMENT, ACTION.UPDATE), validate(generateCicilan), controller.generateCicilan);
router.get('/:id/cicilan', authorize(MENU.KEUANGAN_GENERATE_TAGIHAN_MANAGEMENT, ACTION.READ), controller.getCicilan);
router.put('/:id/cicilan', authorize(MENU.KEUANGAN_GENERATE_TAGIHAN_MANAGEMENT, ACTION.UPDATE), validate(saveCicilan), controller.saveCicilan);
router.get('/:id', authorize(MENU.KEUANGAN_GENERATE_TAGIHAN_MANAGEMENT, ACTION.READ), controller.detail);
router.put('/:id', authorize(MENU.KEUANGAN_GENERATE_TAGIHAN_MANAGEMENT, ACTION.UPDATE), validate(updateTagihan), controller.update);
router.delete('/:id', authorize(MENU.KEUANGAN_GENERATE_TAGIHAN_MANAGEMENT, ACTION.DELETE), controller.remove);
router.post(
  '/generate',
  authorize(MENU.KEUANGAN_GENERATE_TAGIHAN_MANAGEMENT, ACTION.CREATE),
  validate(generateTagihan),
  controller.generate
);

module.exports = router;
