const router = require('express').Router();
const laporanRealisasiController = require('../controllers/laporanRealisasi.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: LaporanRealisasi
 *   description: Laporan cetak realisasi mengajar dosen (read-only, modul BAAK)
 */

/**
 * @swagger
 * /laporan/cetak-realisasi:
 *   get:
 *     summary: List jadwal kuliah beserta jumlah realisasi mengajar (paginated, searchable, filter kelas)
 *     tags: [LaporanRealisasi]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List realisasi mengajar
 */
router.get('/', authorize(MENU.LAPORAN_CETAK_REALISASI_MANAGEMENT, ACTION.READ), laporanRealisasiController.list);

/**
 * @swagger
 * /laporan/cetak-realisasi/kelas-options:
 *   get:
 *     summary: List kelas unik dari jadwal kuliah (untuk dropdown filter "Pilih Program")
 *     tags: [LaporanRealisasi]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of kelas
 */
router.get(
  '/kelas-options',
  authorize(MENU.LAPORAN_CETAK_REALISASI_MANAGEMENT, ACTION.READ),
  laporanRealisasiController.kelasOptions
);

module.exports = router;
