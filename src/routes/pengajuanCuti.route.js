const router = require('express').Router();
const controller = require('../controllers/pengajuanCuti.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { verifikasiCuti } = require('../validations/pengajuanCuti.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

/**
 * @swagger
 * tags:
 *   name: PengajuanCuti
 *   description: Pengajuan cuti akademik dari portal mahasiswa — diverifikasi prodi (menu Master Cuti)
 */

router.use(authenticate);

const CUTI = MENU.PRODI_MAHASISWA_CUTI_MANAGEMENT;

/**
 * @swagger
 * /prodi/pengajuan-cuti:
 *   get:
 *     summary: List pengajuan cuti mahasiswa (filter status, jurusanId, search NIM/nama)
 *     tags: [PengajuanCuti]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/', authorize(CUTI, ACTION.READ), controller.list);

/**
 * @swagger
 * /prodi/pengajuan-cuti/{id}/verifikasi:
 *   put:
 *     summary: Setujui (mahasiswa jadi berstatus CUTI) atau tolak (wajib catatan) pengajuan cuti
 *     tags: [PengajuanCuti]
 *     security: [{ bearerAuth: [] }]
 */
router.put('/:id/verifikasi', authorize(CUTI, ACTION.UPDATE), validate(verifikasiCuti), controller.verifikasi);

/**
 * @swagger
 * /prodi/pengajuan-cuti/{id}/pdf:
 *   get:
 *     summary: Cetak formulir pengajuan cuti
 *     tags: [PengajuanCuti]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/:id/pdf', authorize(CUTI, ACTION.READ), controller.pdf);

module.exports = router;
