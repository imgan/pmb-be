const router = require('express').Router();
const laporanMahasiswaPerkelasController = require('../controllers/laporanMahasiswaPerkelas.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: LaporanMahasiswaPerkelas
 *   description: Rekap laporan mahasiswa per kelas (read-only, modul BAAK)
 */

/**
 * @swagger
 * /laporan/cetak-mahasiswa-perkelas/filter-options:
 *   get:
 *     summary: Opsi filter (Prodi, Kelas, Waktu Kuliah, Tahun Masuk) untuk laporan mahasiswa per kelas
 *     tags: [LaporanMahasiswaPerkelas]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Opsi filter
 */
router.get(
  '/filter-options',
  authorize(MENU.LAPORAN_CETAK_MAHASISWA_PERKELAS_MANAGEMENT, ACTION.READ),
  laporanMahasiswaPerkelasController.filterOptions
);

/**
 * @swagger
 * /laporan/cetak-mahasiswa-perkelas/export:
 *   get:
 *     summary: Export rekap mahasiswa per kelas ke file Excel (.xlsx)
 *     tags: [LaporanMahasiswaPerkelas]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: jurusanId
 *         schema: { type: integer }
 *       - in: query
 *         name: kelas
 *         schema: { type: string }
 *       - in: query
 *         name: waktuKuliah
 *         schema: { type: string }
 *       - in: query
 *         name: tahunMasuk
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: File Excel rekap mahasiswa per kelas
 */
router.get(
  '/export',
  authorize(MENU.LAPORAN_CETAK_MAHASISWA_PERKELAS_MANAGEMENT, ACTION.READ),
  laporanMahasiswaPerkelasController.exportExcel
);

module.exports = router;
