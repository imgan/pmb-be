const router = require('express').Router();
const laporanKhsController = require('../controllers/laporanKhs.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: LaporanKhs
 *   description: Laporan cetak KHS (Kartu Hasil Studi) mahasiswa, read-only (modul BAAK)
 */

/**
 * @swagger
 * /laporan/cetak-khs:
 *   get:
 *     summary: Cari mahasiswa berdasarkan NIM/nama, beserta semester yang tersedia untuk dicetak
 *     tags: [LaporanKhs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *     responses:
 *       200:
 *         description: List mahasiswa
 */
router.get('/', authorize(MENU.LAPORAN_CETAK_KHS_MANAGEMENT, ACTION.READ), laporanKhsController.list);

/**
 * @swagger
 * /laporan/cetak-khs/{mahasiswaId}/pdf:
 *   get:
 *     summary: Cetak KHS (PDF) seorang mahasiswa untuk semester tertentu
 *     tags: [LaporanKhs]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *       - in: query
 *         name: semester
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: File PDF KHS
 *       400:
 *         description: Semester wajib dipilih
 *       404:
 *         description: Mahasiswa not found
 */
router.get('/:mahasiswaId/pdf', authorize(MENU.LAPORAN_CETAK_KHS_MANAGEMENT, ACTION.READ), laporanKhsController.cetakPdf);

module.exports = router;
