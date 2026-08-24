const router = require('express').Router();
const pesertaController = require('../controllers/peserta.controller');
const authenticate = require('../middlewares/auth.middleware');
const authenticatePeserta = require('../middlewares/pesertaAuth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  registerPeserta,
  createPeserta,
  updatePeserta,
  loginPeserta,
  forgotPasswordPeserta,
  resetPasswordPeserta,
  updateMyProfile,
  saveBiodata,
} = require('../validations/peserta.validation');
const { uploadDokumen } = require('../validations/pesertaDokumen.validation');

/**
 * @swagger
 * tags:
 *   name: Peserta
 *   description: Pendaftaran & master data peserta PMB
 */

/**
 * @swagger
 * /peserta/register:
 *   post:
 *     summary: Registrasi peserta baru (public, tanpa login). Password digenerate otomatis dan dikirim via email.
 *     tags: [Peserta]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterPesertaRequest'
 *     responses:
 *       201:
 *         description: Registrasi berhasil
 *       400:
 *         description: Data tidak valid
 *       409:
 *         description: Email sudah terdaftar
 */
router.post('/register', validate(registerPeserta), pesertaController.register);

/**
 * @swagger
 * /peserta/login:
 *   post:
 *     summary: Login peserta menggunakan email & password yang dikirim saat registrasi
 *     tags: [Peserta]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginPesertaRequest'
 *     responses:
 *       200:
 *         description: Login berhasil
 *       401:
 *         description: Email atau password salah
 */
router.post('/login', validate(loginPeserta), pesertaController.login);

/**
 * @swagger
 * /peserta/forgot-password:
 *   post:
 *     summary: Kirim link reset password ke email peserta (jika terdaftar). Selalu balas pesan generik demi keamanan.
 *     tags: [Peserta]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Link reset password dikirim (jika email terdaftar)
 */
router.post('/forgot-password', validate(forgotPasswordPeserta), pesertaController.forgotPassword);

/**
 * @swagger
 * /peserta/reset-password:
 *   post:
 *     summary: Set password baru menggunakan token dari email reset password
 *     tags: [Peserta]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Password berhasil direset
 *       400:
 *         description: Token tidak valid atau sudah kedaluwarsa
 */
router.post('/reset-password', validate(resetPasswordPeserta), pesertaController.resetPassword);

/**
 * @swagger
 * /peserta/me:
 *   get:
 *     summary: Get profil peserta yang sedang login (termasuk biodata jika sudah dilengkapi)
 *     tags: [Peserta]
 *     security: [{ pesertaBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Profil peserta
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticatePeserta, pesertaController.me);

/**
 * @swagger
 * /peserta/me:
 *   put:
 *     summary: Update data pendaftaran milik peserta yang sedang login (nama, asal sekolah, kelas, jurusan, no telepon, email)
 *     tags: [Peserta]
 *     security: [{ pesertaBearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMyProfileRequest'
 *     responses:
 *       200:
 *         description: Profile updated
 *       409:
 *         description: Email already registered
 */
router.put('/me', authenticatePeserta, validate(updateMyProfile), pesertaController.updateMe);

/**
 * @swagger
 * /peserta/me/biodata:
 *   put:
 *     summary: Lengkapi / update biodata personal peserta yang sedang login
 *     tags: [Peserta]
 *     security: [{ pesertaBearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SaveBiodataRequest'
 *     responses:
 *       200:
 *         description: Biodata saved
 *       409:
 *         description: NIK already registered
 */
router.put('/me/biodata', authenticatePeserta, validate(saveBiodata), pesertaController.saveBiodata);

/**
 * @swagger
 * /peserta/me/dokumen:
 *   get:
 *     summary: List seluruh jenis dokumen kelengkapan beserta status upload milik peserta yang sedang login
 *     tags: [Peserta]
 *     security: [{ pesertaBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List dokumen kelengkapan + status upload
 */
router.get('/me/dokumen', authenticatePeserta, pesertaController.listMyDokumen);

/**
 * @swagger
 * /peserta/me/dokumen/{dokumenKelengkapanId}:
 *   put:
 *     summary: Upload / ganti file untuk satu jenis dokumen kelengkapan (PDF, PNG, atau JPEG, base64 data URI)
 *     tags: [Peserta]
 *     security: [{ pesertaBearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UploadPesertaDokumenRequest'
 *     responses:
 *       200:
 *         description: Dokumen uploaded
 *       400:
 *         description: Format file tidak didukung
 *       404:
 *         description: Jenis dokumen kelengkapan tidak ditemukan
 *   delete:
 *     summary: Hapus file dokumen yang sudah diupload untuk satu jenis dokumen kelengkapan
 *     tags: [Peserta]
 *     security: [{ pesertaBearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Dokumen removed
 *       404:
 *         description: Dokumen tidak ditemukan
 */
router.put('/me/dokumen/:dokumenKelengkapanId', authenticatePeserta, validate(uploadDokumen), pesertaController.uploadMyDokumen);
router.delete('/me/dokumen/:dokumenKelengkapanId', authenticatePeserta, pesertaController.removeMyDokumen);

router.use(authenticate);

/**
 * @swagger
 * /peserta:
 *   get:
 *     summary: List peserta (paginated, searchable, bisa difilter per golongan kelas / jurusan)
 *     tags: [Peserta]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SearchParam'
 *       - $ref: '#/components/parameters/GolonganKelasIdQueryParam'
 *     responses:
 *       200:
 *         description: List of peserta
 *   post:
 *     summary: Create a new peserta (admin). Password digenerate otomatis dan dikirim via email.
 *     tags: [Peserta]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePesertaRequest'
 *     responses:
 *       201:
 *         description: Peserta created
 */
router.get('/', pesertaController.list);
router.post('/', validate(createPeserta), pesertaController.create);

/**
 * @swagger
 * /peserta/{id}:
 *   get:
 *     summary: Get peserta detail
 *     tags: [Peserta]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Peserta detail
 *       404:
 *         description: Peserta not found
 *   put:
 *     summary: Update a peserta
 *     tags: [Peserta]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePesertaRequest'
 *     responses:
 *       200:
 *         description: Peserta updated
 *   delete:
 *     summary: Delete a peserta
 *     tags: [Peserta]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Peserta deleted
 */
router.get('/:id', pesertaController.detail);
router.put('/:id', validate(updatePeserta), pesertaController.update);
router.delete('/:id', pesertaController.remove);

module.exports = router;
