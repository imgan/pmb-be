const router = require('express').Router();
const controller = require('../controllers/laporanKeuangan.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: LaporanKeuangan
 *   description: Laporan Tunggakan Mahasiswa, Uang Kuliah & Bebas Tunggakan (modul Keuangan)
 */

router.get(
  '/tunggakan-mahasiswa',
  authorize(MENU.KEUANGAN_LAPORAN_TUNGGAKAN_MAHASISWA_MANAGEMENT, ACTION.READ),
  controller.tunggakanMahasiswa
);
router.get(
  '/bebas-tunggakan',
  authorize(MENU.KEUANGAN_LAPORAN_BEBAS_TUNGGAKAN_MANAGEMENT, ACTION.READ),
  controller.bebasTunggakan
);
router.get(
  '/uang-kuliah',
  authorize(MENU.KEUANGAN_LAPORAN_UANG_KULIAH_MANAGEMENT, ACTION.READ),
  controller.uangKuliah
);
router.get(
  '/tunggakan',
  authorize(MENU.KEUANGAN_LAPORAN_TUNGGAKAN_MANAGEMENT, ACTION.READ),
  controller.tunggakan
);
router.get(
  '/tunggakan/export',
  authorize(MENU.KEUANGAN_LAPORAN_TUNGGAKAN_MANAGEMENT, ACTION.READ),
  controller.exportTunggakan
);
router.get(
  '/sertifikasi',
  authorize(MENU.KEUANGAN_LAPORAN_SERTIFIKASI_MANAGEMENT, ACTION.READ),
  controller.sertifikasi
);
router.get(
  '/tunggakan-mahasiswa/ta-skripsi',
  authorize(MENU.KEUANGAN_LAPORAN_TUNGGAKAN_MAHASISWA_MANAGEMENT, ACTION.READ),
  controller.tunggakanTaSkripsi
);
router.get(
  '/tunggakan-mahasiswa/biaya-lain',
  authorize(MENU.KEUANGAN_LAPORAN_TUNGGAKAN_MAHASISWA_MANAGEMENT, ACTION.READ),
  controller.tunggakanBiayaLain
);
router.get(
  '/tunggakan-mahasiswa/export/mahasiswa',
  authorize(MENU.KEUANGAN_LAPORAN_TUNGGAKAN_MAHASISWA_MANAGEMENT, ACTION.READ),
  controller.exportTunggakanPerMahasiswa
);
router.get(
  '/tunggakan-mahasiswa/export/jurusan',
  authorize(MENU.KEUANGAN_LAPORAN_TUNGGAKAN_MAHASISWA_MANAGEMENT, ACTION.READ),
  controller.exportTunggakanPerJurusan
);

module.exports = router;
