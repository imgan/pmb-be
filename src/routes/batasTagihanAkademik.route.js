const router = require('express').Router();
const controller = require('../controllers/batasTagihanAkademik.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { updateBatasTagihanAkademik } = require('../validations/batasTagihanAkademik.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: BatasTagihanAkademik
 *   description: Batas tagihan per prodi untuk isi KRS & lihat nilai mahasiswa (modul Keuangan)
 */

/**
 * @swagger
 * /keuangan/batas-tagihan-akademik:
 *   get:
 *     summary: Daftar semua prodi beserta konfigurasi batas tagihan KRS & nilai
 *     tags: [BatasTagihanAkademik]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Satu baris per prodi
 * /keuangan/batas-tagihan-akademik/{jurusanId}:
 *   put:
 *     summary: Simpan konfigurasi batas tagihan satu prodi
 *     tags: [BatasTagihanAkademik]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: jurusanId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               krsAktif: { type: boolean }
 *               minBayarKrs: { type: number, description: "Minimal persen sudah dibayar (0-100)" }
 *               utsAktif: { type: boolean }
 *               minBayarUts: { type: number, description: "Minimal persen sudah dibayar (0-100)" }
 *               nilaiAktif: { type: boolean }
 *               minBayarNilai: { type: number, description: "Minimal persen sudah dibayar (0-100)" }
 *     responses:
 *       200:
 *         description: Konfigurasi tersimpan
 */
router.get('/', authorize(MENU.KEUANGAN_BATAS_TAGIHAN_AKADEMIK_MANAGEMENT, ACTION.READ), controller.list);
// Status cekal (KRS / UTS / nilai) per mahasiswa aktif satu prodi — mis. daftar boleh ikut UTS.
router.get(
  '/status-mahasiswa',
  authorize([MENU.KEUANGAN_BATAS_TAGIHAN_AKADEMIK_MANAGEMENT, MENU.MAHASISWA_MANAGEMENT], ACTION.READ),
  controller.statusMahasiswa
);
router.put(
  '/:jurusanId',
  authorize(MENU.KEUANGAN_BATAS_TAGIHAN_AKADEMIK_MANAGEMENT, ACTION.UPDATE),
  validate(updateBatasTagihanAkademik),
  controller.update
);

module.exports = router;
