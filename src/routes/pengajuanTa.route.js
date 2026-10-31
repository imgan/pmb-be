const router = require('express').Router();
const controller = require('../controllers/pengajuanTa.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createPeriode, updatePeriode, verifikasiTa } = require('../validations/pengajuanTa.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

const PERIODE = MENU.PRODI_PERIODE_PENGAJUAN_TA_MANAGEMENT;
const PENGAJUAN = MENU.PRODI_PENGAJUAN_TA_MANAGEMENT;

/**
 * @swagger
 * /pengajuan-ta/periode:
 *   get:
 *     summary: List periode pengajuan TA/Skripsi (filter jurusanId) beserta jumlah pengajuan
 *     tags: [PengajuanTa]
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     summary: Buka periode pengajuan TA/Skripsi
 *     tags: [PengajuanTa]
 *     security: [{ bearerAuth: [] }]
 * /pengajuan-ta/periode/{id}:
 *   put:
 *     summary: Ubah periode pengajuan
 *     tags: [PengajuanTa]
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     summary: Hapus periode (ditolak bila sudah ada pengajuan)
 *     tags: [PengajuanTa]
 *     security: [{ bearerAuth: [] }]
 * /pengajuan-ta:
 *   get:
 *     summary: List pengajuan TA/Skripsi mahasiswa (filter periodeId, status, jurusanId, search)
 *     tags: [PengajuanTa]
 *     security: [{ bearerAuth: [] }]
 * /pengajuan-ta/{id}/verifikasi:
 *   put:
 *     summary: Setujui / tolak pengajuan (boleh sekaligus ubah judul & pembimbing)
 *     tags: [PengajuanTa]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/periode', authorize([PERIODE, PENGAJUAN], ACTION.READ), controller.listPeriode);
router.post('/periode', authorize(PERIODE, ACTION.CREATE), validate(createPeriode), controller.createPeriode);
router.put('/periode/:id', authorize(PERIODE, ACTION.UPDATE), validate(updatePeriode), controller.updatePeriode);
router.delete('/periode/:id', authorize(PERIODE, ACTION.DELETE), controller.deletePeriode);
router.get('/', authorize(PENGAJUAN, ACTION.READ), controller.listPengajuan);
router.put('/:id/verifikasi', authorize(PENGAJUAN, ACTION.UPDATE), validate(verifikasiTa), controller.verifikasi);

module.exports = router;
