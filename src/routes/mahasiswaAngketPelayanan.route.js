const router = require('express').Router();
const controller = require('../controllers/mahasiswaAngketPelayanan.controller');
const authenticateMahasiswa = require('../middlewares/mahasiswaAuth.middleware');
const validate = require('../middlewares/validate.middleware');
const { submit } = require('../validations/angketPelayanan.validation');

router.use(authenticateMahasiswa);

/**
 * @swagger
 * /mahasiswa-portal/angket-pelayanan:
 *   get:
 *     summary: Status angket pelayanan (kepuasan layanan institusi) mahasiswa login untuk satu tahun
 *       ajaran, beserta daftar pertanyaan bila belum diisi. Wajib diisi sebelum simpan/ajukan KRS.
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: tahunAjaranId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: sudahDiisi + pertanyaan (skala 1–5)
 *   post:
 *     summary: Kirim angket pelayanan untuk satu tahun ajaran (sekali per periode, tidak bisa diubah)
 *     tags: [MahasiswaPortal]
 *     security: [{ mahasiswaBearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Angket terkirim
 *       409:
 *         description: Angket periode ini sudah diisi
 */
router.get('/', controller.getStatus);
router.post('/', validate(submit), controller.submit);

module.exports = router;
