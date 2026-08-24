const router = require('express').Router();
const laporanIjazahController = require('../controllers/laporanIjazah.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: LaporanIjazah
 *   description: Laporan cetak ijazah & transkrip nilai mahasiswa (read-only, modul BAAK)
 */

/**
 * @swagger
 * /laporan/ijazah-transkrip:
 *   get:
 *     summary: List mahasiswa yang sudah yudisium (lulus), beserta total SKS & IPK
 *     tags: [LaporanIjazah]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List lulusan
 */
router.get(
  '/',
  authorize(MENU.LAPORAN_IJAZAH_TRANSKRIP_MANAGEMENT, ACTION.READ),
  laporanIjazahController.list
);

/**
 * @swagger
 * /laporan/ijazah-transkrip/tahun-lulus-options:
 *   get:
 *     summary: List tahun lulus unik (untuk dropdown filter "Tahun Lulus")
 *     tags: [LaporanIjazah]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of tahun lulus
 */
router.get(
  '/tahun-lulus-options',
  authorize(MENU.LAPORAN_IJAZAH_TRANSKRIP_MANAGEMENT, ACTION.READ),
  laporanIjazahController.tahunLulusOptions
);

/**
 * @swagger
 * /laporan/ijazah-transkrip/{mahasiswaId}/cetak:
 *   get:
 *     summary: Data lengkap untuk mencetak ijazah/transkrip/surat/SKPI seorang mahasiswa
 *     tags: [LaporanIjazah]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Data cetak
 *       400:
 *         description: Mahasiswa belum yudisium
 *       404:
 *         description: Mahasiswa not found
 */
router.get(
  '/:mahasiswaId/cetak',
  authorize(MENU.LAPORAN_IJAZAH_TRANSKRIP_MANAGEMENT, ACTION.READ),
  laporanIjazahController.cetakData
);

/**
 * @swagger
 * /laporan/ijazah-transkrip/{mahasiswaId}/cetak/{jenis}/pdf:
 *   get:
 *     summary: Cetak dokumen (ijazah/ijazah-duplikat/transkrip/surat-keterangan-lulus/skpi) sebagai file PDF
 *     tags: [LaporanIjazah]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *       - in: path
 *         name: jenis
 *         required: true
 *         schema: { type: string, enum: [ijazah, ijazah-duplikat, transkrip, surat-keterangan-lulus, skpi] }
 *     responses:
 *       200:
 *         description: File PDF
 *       400:
 *         description: Jenis dokumen tidak dikenal, atau mahasiswa belum yudisium
 *       404:
 *         description: Mahasiswa not found
 */
router.get(
  '/:mahasiswaId/cetak/:jenis/pdf',
  authorize(MENU.LAPORAN_IJAZAH_TRANSKRIP_MANAGEMENT, ACTION.READ),
  laporanIjazahController.cetakPdf
);

module.exports = router;
