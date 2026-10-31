const router = require('express').Router();
const controller = require('../controllers/pmbGrafik.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: PmbGrafik
 *   description: Master grafik PMB (modul PMB)
 */

/**
 * @swagger
 * /pmb-grafik/banding:
 *   get:
 *     summary: Grafik Banding — jumlah Mendaftar / Seleksi / Wawancara / DU per bulan daftar dalam satu tahun
 *     tags: [PmbGrafik]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: tahun
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Data per tahap per bulan
 * /pmb-grafik/tahun-options:
 *   get:
 *     summary: Pilihan tahun (tahun yang punya data pendaftar + tahun berjalan)
 *     tags: [PmbGrafik]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Daftar tahun
 * /pmb-grafik/daftar-ulang:
 *   get:
 *     summary: Grafik DU — jumlah mahasiswa daftar ulang per prodi per tahun masuk
 *     tags: [PmbGrafik]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Kolom tahun dan baris per prodi
 */
const canBanding = authorize(MENU.PMB_GRAFIK_BANDING_MANAGEMENT, ACTION.READ);
const canPenerimaan = authorize(MENU.PMB_GRAFIK_PENERIMAAN_MANAGEMENT, ACTION.READ);
const canDaftarUlang = authorize(MENU.PMB_GRAFIK_DAFTAR_ULANG_MANAGEMENT, ACTION.READ);

router.get('/banding', canBanding, controller.banding);
router.get('/tahun-options', canBanding, controller.tahunOptions);
router.get('/penerimaan', canPenerimaan, controller.penerimaan);
router.get('/penerimaan/tahun-options', canPenerimaan, controller.tahunMasukOptions);
router.get('/daftar-ulang', canDaftarUlang, controller.daftarUlang);

module.exports = router;
