const router = require('express').Router();
const controller = require('../controllers/pembayaranTaSkripsi.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createPembayaran, generateTagihan } = require('../validations/pembayaranTaSkripsi.validation');
const { saveCicilan } = require('../validations/tagihanKuliah.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: PembayaranTaSkripsi
 *   description: Tagihan, cicilan & pembayaran biaya TA/Skripsi mahasiswa (modul Keuangan), pola sama dengan Pembayaran Wisuda
 */

const MENU_TA = MENU.KEUANGAN_PEMBAYARAN_TA_SKRIPSI_MANAGEMENT;

router.get('/', authorize(MENU_TA, ACTION.READ), controller.list);
// Daftar mahasiswa + status bayar (filter: search, statusBayar, kodeProdi) — sebelum '/:id'.
router.get('/mahasiswa', authorize(MENU_TA, ACTION.READ), controller.listMahasiswa);
router.get('/mahasiswa/:mahasiswaId/opsi-tagihan', authorize(MENU_TA, ACTION.READ), controller.opsiTagihan);
router.get('/tagihan/:tagihanId/cicilan', authorize(MENU_TA, ACTION.READ), controller.getCicilan);
router.put('/tagihan/:tagihanId/cicilan', authorize(MENU_TA, ACTION.UPDATE), validate(saveCicilan), controller.saveCicilan);
router.get('/opsi-generate', authorize(MENU_TA, ACTION.READ), controller.opsiGenerate);
// Generate tagihan dari Tarif TA/Skripsi untuk mahasiswa semester 5 ke atas (pratinjau: true = hanya menghitung).
router.post('/generate', authorize(MENU_TA, ACTION.CREATE), validate(generateTagihan), controller.generate);
router.post('/', authorize(MENU_TA, ACTION.CREATE), validate(createPembayaran), controller.create);
router.get('/:id/kwitansi', authorize(MENU_TA, ACTION.READ), controller.kwitansiPdf);
router.delete('/:id', authorize(MENU_TA, ACTION.DELETE), controller.remove);

module.exports = router;
