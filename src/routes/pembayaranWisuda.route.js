const router = require('express').Router();
const controller = require('../controllers/pembayaranWisuda.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createPembayaranWisuda, generateTagihanWisuda } = require('../validations/pembayaranWisuda.validation');
const { saveCicilan } = require('../validations/tagihanKuliah.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: PembayaranWisuda
 *   description: Transaksi pembayaran biaya wisuda mahasiswa (modul Keuangan)
 */

router.get('/', authorize(MENU.KEUANGAN_PEMBAYARAN_WISUDA_MANAGEMENT, ACTION.READ), controller.list);
// Daftar mahasiswa + status bayar & tahun lulus (filter: search, statusBayar, tahunLulus) — sebelum '/:id'.
router.get('/mahasiswa', authorize(MENU.KEUANGAN_PEMBAYARAN_WISUDA_MANAGEMENT, ACTION.READ), controller.listMahasiswa);
router.get('/mahasiswa/:mahasiswaId/opsi-tagihan', authorize(MENU.KEUANGAN_PEMBAYARAN_WISUDA_MANAGEMENT, ACTION.READ), controller.opsiTagihan);
router.get('/tagihan/:tagihanId/cicilan', authorize(MENU.KEUANGAN_PEMBAYARAN_WISUDA_MANAGEMENT, ACTION.READ), controller.getCicilan);
router.put('/tagihan/:tagihanId/cicilan', authorize(MENU.KEUANGAN_PEMBAYARAN_WISUDA_MANAGEMENT, ACTION.UPDATE), validate(saveCicilan), controller.saveCicilan);
router.get('/opsi-generate', authorize(MENU.KEUANGAN_PEMBAYARAN_WISUDA_MANAGEMENT, ACTION.READ), controller.opsiGenerate);
// Generate tagihan dari tarif berkode W untuk mahasiswa semester 5 ke atas (pratinjau: true = hanya menghitung).
router.post('/generate', authorize(MENU.KEUANGAN_PEMBAYARAN_WISUDA_MANAGEMENT, ACTION.CREATE), validate(generateTagihanWisuda), controller.generate);
router.post(
  '/',
  authorize(MENU.KEUANGAN_PEMBAYARAN_WISUDA_MANAGEMENT, ACTION.CREATE),
  validate(createPembayaranWisuda),
  controller.create
);
router.get('/:id/kwitansi', authorize(MENU.KEUANGAN_PEMBAYARAN_WISUDA_MANAGEMENT, ACTION.READ), controller.kwitansiPdf);
router.delete('/:id', authorize(MENU.KEUANGAN_PEMBAYARAN_WISUDA_MANAGEMENT, ACTION.DELETE), controller.remove);

module.exports = router;
