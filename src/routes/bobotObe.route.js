const router = require('express').Router();
const Joi = require('joi');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const service = require('../services/bobotObe.service');
const { bobotObe } = require('../validations/dosenKelas.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

router.use(authenticate);
const CODE = MENU.PRODI_BOBOT_OBE_MANAGEMENT;

const listQuery = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(500),
  search: Joi.string().allow(''),
  tahunAjaranId: Joi.number().integer(),
  kodeProdi: Joi.string().allow(''),
  status: Joi.string().valid('TERISI', 'BELUM', ''),
}).unknown(true);

/**
 * @swagger
 * /prodi/bobot-obe:
 *   get:
 *     summary: Daftar jadwal kuliah beserta Bobot OBE (filter tahunAjaranId, kodeProdi, status TERISI/BELUM, search)
 *     tags: [BobotObe]
 *     security: [{ bearerAuth: [] }]
 * /prodi/bobot-obe/{jadwalKuliahId}:
 *   put:
 *     summary: Ubah Bobot OBE satu jadwal (total 100%); nilai yang sudah ada dihitung ulang
 *     tags: [BobotObe]
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     summary: Hapus Bobot OBE satu jadwal (dosen wajib mengisi ulang sebelum menyimpan nilai)
 *     tags: [BobotObe]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/',
  authorize(CODE, ACTION.READ),
  catchAsync(async (req, res) => {
    const { error, value } = listQuery.validate(req.query);
    if (error) return sendResponse(res, 400, { success: false, message: error.message });
    const { data, meta } = await service.listBobotProdi(value);
    return sendResponse(res, 200, { message: 'Bobot OBE fetched', data, meta });
  })
);
router.put(
  '/:jadwalKuliahId',
  authorize(CODE, ACTION.UPDATE),
  validate(bobotObe),
  catchAsync(async (req, res) => {
    const data = await service.simpanBobot(Number(req.params.jadwalKuliahId), req.body, { userId: req.user.id });
    sendResponse(res, 200, {
      message: data.nilaiDihitungUlang ? `Bobot OBE disimpan, ${data.nilaiDihitungUlang} nilai dihitung ulang` : 'Bobot OBE disimpan',
      data,
    });
  })
);
router.delete(
  '/:jadwalKuliahId',
  authorize(CODE, ACTION.DELETE),
  catchAsync(async (req, res) => {
    await service.hapusBobot(Number(req.params.jadwalKuliahId));
    sendResponse(res, 200, { message: 'Bobot OBE dihapus; dosen wajib mengisi ulang sebelum menyimpan nilai' });
  })
);

module.exports = router;
