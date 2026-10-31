const router = require('express').Router();
const Joi = require('joi');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const service = require('../services/angketDosenPertanyaan.service');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);
const CODE = MENU.PRODI_ANGKET_DOSEN_PERTANYAAN_MANAGEMENT;

const pertanyaan = Joi.string().trim().min(3).max(1000);
const kategori = Joi.string().trim().max(100).allow('', null);
const createSchema = Joi.object({
  tahunAjaranId: Joi.number().integer().required(),
  jenjangPendidikan: Joi.string().trim().max(50).required(),
  kategori,
  pertanyaan: pertanyaan.required(),
  openQuestion: Joi.boolean().default(false),
  urutan: Joi.number().integer().min(0).max(9999).allow(null),
});
const updateSchema = Joi.object({
  kategori,
  pertanyaan,
  openQuestion: Joi.boolean(),
  urutan: Joi.number().integer().min(0).max(9999).allow(null),
});

const salinSchema = Joi.object({
  dariTahunAjaranId: Joi.number().integer().required(),
  dariJenjang: Joi.string().trim().max(50).required(),
  keTahunAjaranId: Joi.number().integer().required(),
  keJenjang: Joi.string().trim().max(50).required(),
  ganti: Joi.boolean().default(false),
});

const jawabanSchema = (wajib) =>
  Joi.object({
    jawaban: wajib ? Joi.string().trim().min(1).max(100).required() : Joi.string().trim().min(1).max(100),
    nilai: wajib ? Joi.number().integer().min(0).max(100).required() : Joi.number().integer().min(0).max(100),
  });

/**
 * @swagger
 * /prodi/angket-dosen-pertanyaan/jawaban:
 *   get:
 *     summary: Pilihan jawaban angket dosen (skala nilai), urut nilai tertinggi
 *     tags: [AngketDosen]
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     summary: Tambah pilihan jawaban (nilai unik)
 *     tags: [AngketDosen]
 *     security: [{ bearerAuth: [] }]
 * /prodi/angket-dosen-pertanyaan/jawaban/{id}:
 *   put:
 *     summary: Ubah pilihan jawaban
 *     tags: [AngketDosen]
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     summary: Hapus pilihan jawaban
 *     tags: [AngketDosen]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/jawaban',
  authorize(CODE, ACTION.READ),
  catchAsync(async (req, res) => {
    sendResponse(res, 200, { message: 'Jawaban angket dosen fetched', data: await service.listJawaban() });
  })
);
router.post(
  '/jawaban',
  authorize(CODE, ACTION.CREATE),
  validate(jawabanSchema(true)),
  catchAsync(async (req, res) => {
    sendResponse(res, 201, { message: 'Jawaban ditambahkan', data: await service.createJawaban(req.body, req.user.id) });
  })
);
router.put(
  '/jawaban/:id',
  authorize(CODE, ACTION.UPDATE),
  validate(jawabanSchema(false)),
  catchAsync(async (req, res) => {
    sendResponse(res, 200, { message: 'Jawaban diperbarui', data: await service.updateJawaban(Number(req.params.id), req.body, req.user.id) });
  })
);
router.delete(
  '/jawaban/:id',
  authorize(CODE, ACTION.DELETE),
  catchAsync(async (req, res) => {
    await service.removeJawaban(Number(req.params.id));
    sendResponse(res, 200, { message: 'Jawaban dihapus' });
  })
);

/**
 * @swagger
 * /prodi/angket-dosen-pertanyaan:
 *   get:
 *     summary: Pertanyaan angket dosen per periode (tahunAjaranId) & tk. pendidikan (jenjang), filter kategori
 *     tags: [AngketDosen]
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     summary: Tambah pertanyaan
 *     tags: [AngketDosen]
 *     security: [{ bearerAuth: [] }]
 * /prodi/angket-dosen-pertanyaan/salin:
 *   post:
 *     summary: Salin pertanyaan dari periode/tk. pendidikan lain (ganti=true menimpa daftar tujuan)
 *     tags: [AngketDosen]
 *     security: [{ bearerAuth: [] }]
 * /prodi/angket-dosen-pertanyaan/{id}:
 *   put:
 *     summary: Ubah pertanyaan / open question / urutan
 *     tags: [AngketDosen]
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     summary: Hapus pertanyaan
 *     tags: [AngketDosen]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/',
  authorize(CODE, ACTION.READ),
  catchAsync(async (req, res) => {
    const { data, ...meta } = await service.list(req.query);
    sendResponse(res, 200, { message: 'Pertanyaan angket dosen fetched', data, meta });
  })
);
router.post(
  '/salin',
  authorize(CODE, ACTION.CREATE),
  validate(salinSchema),
  catchAsync(async (req, res) => {
    const data = await service.salin(req.body, req.user.id);
    sendResponse(res, 200, { message: `${data.disalin} pertanyaan disalin`, data });
  })
);
router.post(
  '/',
  authorize(CODE, ACTION.CREATE),
  validate(createSchema),
  catchAsync(async (req, res) => {
    sendResponse(res, 201, { message: 'Pertanyaan ditambahkan', data: await service.create(req.body, req.user.id) });
  })
);
router.put(
  '/:id',
  authorize(CODE, ACTION.UPDATE),
  validate(updateSchema),
  catchAsync(async (req, res) => {
    sendResponse(res, 200, { message: 'Pertanyaan diperbarui', data: await service.update(Number(req.params.id), req.body, req.user.id) });
  })
);
router.delete(
  '/:id',
  authorize(CODE, ACTION.DELETE),
  catchAsync(async (req, res) => {
    await service.remove(Number(req.params.id));
    sendResponse(res, 200, { message: 'Pertanyaan dihapus' });
  })
);

module.exports = router;
