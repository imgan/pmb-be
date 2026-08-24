const router = require('express').Router();
const laporanKehadiranMengajarController = require('../controllers/laporanKehadiranMengajar.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: LaporanKehadiranMengajar
 *   description: Template kehadiran & realisasi mengajar per jadwal kuliah (read-only, modul BAAK)
 */

/**
 * @swagger
 * /laporan/kehadiran-mengajar/{jadwalKuliahId}/template-kehadiran/pdf:
 *   get:
 *     summary: Cetak daftar hadir mengajar kosong (template) untuk satu jadwal kuliah, sebagai PDF
 *     tags: [LaporanKehadiranMengajar]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: File PDF
 *       404:
 *         description: Jadwal kuliah not found
 */
router.get(
  '/:jadwalKuliahId/template-kehadiran/pdf',
  authorize(MENU.LAPORAN_CETAK_KEHADIRAN_MENGAJAR_MANAGEMENT, ACTION.READ),
  laporanKehadiranMengajarController.cetakTemplateKehadiran
);

/**
 * @swagger
 * /laporan/kehadiran-mengajar/{jadwalKuliahId}/template-realisasi/pdf:
 *   get:
 *     summary: Cetak rekap realisasi kehadiran mengajar untuk satu jadwal kuliah, sebagai PDF
 *     tags: [LaporanKehadiranMengajar]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: File PDF
 *       404:
 *         description: Jadwal kuliah not found
 */
router.get(
  '/:jadwalKuliahId/template-realisasi/pdf',
  authorize(MENU.LAPORAN_CETAK_KEHADIRAN_MENGAJAR_MANAGEMENT, ACTION.READ),
  laporanKehadiranMengajarController.cetakTemplateRealisasi
);

module.exports = router;
