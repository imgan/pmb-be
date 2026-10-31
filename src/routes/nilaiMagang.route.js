const router = require('express').Router();
const controller = require('../controllers/nilaiMagang.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { createNilaiMagang, updateNilaiMagang } = require('../validations/nilaiMagang.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: NilaiMagang
 *   description: Nilai magang mahasiswa (modul Prodi)
 */

/**
 * @swagger
 * /prodi/nilai-magang:
 *   get:
 *     summary: Daftar nilai magang (filter search, tahunAjaranId, jurusanId)
 *     tags: [NilaiMagang]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Daftar nilai magang
 *   post:
 *     summary: Input nilai magang satu mahasiswa (grade dihitung otomatis dari nilai)
 *     tags: [NilaiMagang]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Nilai magang tersimpan
 * /prodi/nilai-magang/prefill/{mahasiswaId}:
 *   get:
 *     summary: Judul & dosen pembimbing dari Bimbingan Magang untuk mengisi form otomatis
 *     tags: [NilaiMagang]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: mahasiswaId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Data awal form
 * /prodi/nilai-magang/{id}:
 *   get:
 *     summary: Detail nilai magang
 *     tags: [NilaiMagang]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Detail
 *   put:
 *     summary: Ubah nilai magang
 *     tags: [NilaiMagang]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Tersimpan
 *   delete:
 *     summary: Hapus nilai magang
 *     tags: [NilaiMagang]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Terhapus
 */
router.get('/', authorize(MENU.PRODI_NILAI_MAGANG_MANAGEMENT, ACTION.READ), controller.list);
router.post('/', authorize(MENU.PRODI_NILAI_MAGANG_MANAGEMENT, ACTION.CREATE), validate(createNilaiMagang), controller.create);
router.get('/prefill/:mahasiswaId', authorize(MENU.PRODI_NILAI_MAGANG_MANAGEMENT, ACTION.READ), controller.prefill);
router.get('/:id', authorize(MENU.PRODI_NILAI_MAGANG_MANAGEMENT, ACTION.READ), controller.detail);
router.put('/:id', authorize(MENU.PRODI_NILAI_MAGANG_MANAGEMENT, ACTION.UPDATE), validate(updateNilaiMagang), controller.update);
router.delete('/:id', authorize(MENU.PRODI_NILAI_MAGANG_MANAGEMENT, ACTION.DELETE), controller.remove);

module.exports = router;
