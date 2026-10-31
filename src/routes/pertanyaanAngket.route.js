const router = require('express').Router();
const Joi = require('joi');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const service = require('../services/angketPelayanan.service');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);
const CODE = MENU.PRODI_PERTANYAAN_ANGKET_MANAGEMENT;

const body = (wajib) =>
  Joi.object({
    kategori: Joi.string().trim().max(100).allow('', null),
    pertanyaan: wajib ? Joi.string().trim().min(3).max(1000).required() : Joi.string().trim().min(3).max(1000),
    urutan: Joi.number().integer().min(0).max(9999).allow(null),
    isActive: Joi.boolean(),
  });

/**
 * @swagger
 * /prodi/pertanyaan-angket:
 *   get:
 *     summary: Daftar pertanyaan angket pelayanan (filter search, kategori, status AKTIF/NONAKTIF) + jumlah jawaban
 *     tags: [AngketPelayanan]
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     summary: Tambah pertanyaan angket (urutan kosong = paling akhir)
 *     tags: [AngketPelayanan]
 *     security: [{ bearerAuth: [] }]
 * /prodi/pertanyaan-angket/{id}:
 *   put:
 *     summary: Ubah pertanyaan / kategori / urutan / status aktif
 *     tags: [AngketPelayanan]
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     summary: Hapus pertanyaan yang belum pernah dijawab (yang sudah dijawab cukup dinonaktifkan)
 *     tags: [AngketPelayanan]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/',
  authorize(CODE, ACTION.READ),
  catchAsync(async (req, res) => {
    const { data, kategoriList } = await service.listPertanyaan(req.query);
    sendResponse(res, 200, { message: 'Pertanyaan angket fetched', data, meta: { kategoriList } });
  })
);
router.post(
  '/',
  authorize(CODE, ACTION.CREATE),
  validate(body(true)),
  catchAsync(async (req, res) => {
    sendResponse(res, 201, { message: 'Pertanyaan ditambahkan', data: await service.createPertanyaan(req.body) });
  })
);
router.put(
  '/:id',
  authorize(CODE, ACTION.UPDATE),
  validate(body(false)),
  catchAsync(async (req, res) => {
    sendResponse(res, 200, { message: 'Pertanyaan diperbarui', data: await service.updatePertanyaan(Number(req.params.id), req.body) });
  })
);
router.delete(
  '/:id',
  authorize(CODE, ACTION.DELETE),
  catchAsync(async (req, res) => {
    await service.deletePertanyaan(Number(req.params.id));
    sendResponse(res, 200, { message: 'Pertanyaan dihapus' });
  })
);

module.exports = router;
