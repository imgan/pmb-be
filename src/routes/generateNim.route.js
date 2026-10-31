const router = require('express').Router();
const controller = require('../controllers/generateNim.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');
const { setKelas, generatePerKelas } = require('../validations/generateNim.validation');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: GenerateNim
 *   description: BAAK > Generate NIM — pilih kelas mahasiswa baru, lalu generate KRS, tagihan & status
 *     aktif semester 1 per kelas. Nama kelas = singkatan prodi + semester + huruf kelas + P/M (mis. TI1AP).
 */

/**
 * @swagger
 * /generate-nim/mahasiswa:
 *   get:
 *     summary: List mahasiswa baru (status masuk BARU) pada tahun ajaran (default tahun ajaran aktif)
 *     tags: [GenerateNim]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: tahunAjaranId, schema: { type: integer } }
 *       - { in: query, name: jurusanId, schema: { type: integer } }
 *       - { in: query, name: namaKelas, schema: { type: string }, description: "'-' = belum punya kelas" }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses:
 *       200:
 *         description: List mahasiswa beserta nama kelas & status KRS/tagihan/aktif
 */
router.get('/mahasiswa', authorize(MENU.BAAK_GENERATE_NIM_MANAGEMENT, ACTION.READ), controller.listMahasiswa);

/**
 * @swagger
 * /generate-nim/kelas:
 *   get:
 *     summary: Ringkasan per nama kelas (jumlah mahasiswa, jadwal kuliah cocok, progres generate)
 *     tags: [GenerateNim]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Ringkasan kelas
 *   put:
 *     summary: Pilih kelas (huruf) & waktu kuliah (P/M) untuk beberapa mahasiswa sekaligus
 *     tags: [GenerateNim]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Kelas tersimpan
 */
router.get('/kelas', authorize(MENU.BAAK_GENERATE_NIM_MANAGEMENT, ACTION.READ), controller.listKelas);
router.put('/kelas', authorize(MENU.BAAK_GENERATE_NIM_MANAGEMENT, ACTION.UPDATE), validate(setKelas), controller.setKelas);

/**
 * @swagger
 * /generate-nim/krs:
 *   post:
 *     summary: Generate KRS semester 1 (DISETUJUI) untuk satu kelas dari jadwal kuliah dengan nama kelas yang sama
 *     tags: [GenerateNim]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: KRS digenerate
 *       400:
 *         description: Belum ada jadwal kuliah untuk kelas tsb
 * /generate-nim/tagihan:
 *   post:
 *     summary: Generate tagihan kuliah semester 1 untuk satu kelas
 *     tags: [GenerateNim]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Tagihan digenerate
 * /generate-nim/status-aktif:
 *   post:
 *     summary: Generate status aktif (AKM status A) semester 1 untuk satu kelas
 *     tags: [GenerateNim]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Status aktif digenerate
 */
const canGenerate = authorize(MENU.BAAK_GENERATE_NIM_MANAGEMENT, ACTION.CREATE);
router.post('/krs', canGenerate, validate(generatePerKelas), controller.generateKrs);
router.post('/tagihan', canGenerate, validate(generatePerKelas), controller.generateTagihan);
router.post('/status-aktif', canGenerate, validate(generatePerKelas), controller.generateStatusAktif);

module.exports = router;
