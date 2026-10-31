const router = require('express').Router();
const controller = require('../controllers/tiketMahasiswa.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { tanggapiTiket } = require('../validations/tiketMahasiswa.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * /sim/tiket-mahasiswa:
 *   get:
 *     summary: List tiket bantuan mahasiswa (filter status, jenisKebutuhan, search) + ringkasan per status di meta
 *     tags: [TiketMahasiswa]
 *     security: [{ bearerAuth: [] }]
 * /sim/tiket-mahasiswa/{id}:
 *   get:
 *     summary: Detail tiket
 *     tags: [TiketMahasiswa]
 *     security: [{ bearerAuth: [] }]
 * /sim/tiket-mahasiswa/{id}/tanggapi:
 *   put:
 *     summary: Ubah status & isi tanggapan tiket (petugas = user login)
 *     tags: [TiketMahasiswa]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/', authorize(MENU.SIM_TIKET_MAHASISWA_MANAGEMENT, ACTION.READ), controller.list);
router.get('/:id', authorize(MENU.SIM_TIKET_MAHASISWA_MANAGEMENT, ACTION.READ), controller.detail);
router.put('/:id/tanggapi', authorize(MENU.SIM_TIKET_MAHASISWA_MANAGEMENT, ACTION.UPDATE), validate(tanggapiTiket), controller.tanggapi);

module.exports = router;
