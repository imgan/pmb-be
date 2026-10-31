const router = require('express').Router();
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const { sendWorkbook } = require('../utils/excel');
const service = require('../services/jadwalUjian.service');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { simpanJadwalUjian } = require('../validations/jadwalUjian.validation');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

/**
 * @swagger
 * tags:
 *   name: JadwalUjian
 *   description: Jadwal UTS/UAS — daftar dari jadwal kuliah BAAK, prodi mengisi status/sifat/tanggal (dibatasi ke prodi sesi)
 */

router.use(authenticate);
const CODE = MENU.PRODI_JADWAL_UJIAN_MANAGEMENT;

/**
 * @swagger
 * /prodi/jadwal-ujian:
 *   get:
 *     summary: Daftar kelas (jadwal kuliah) + isian jadwal ujian (query jenisUjian UTS/UAS, tahunAjaranId [default aktif], kelas, search)
 *     tags: [JadwalUjian]
 *     security: [{ bearerAuth: [] }]
 * /prodi/jadwal-ujian/export:
 *   get:
 *     summary: Export Excel jadwal ujian (filter sama dengan list)
 *     tags: [JadwalUjian]
 *     security: [{ bearerAuth: [] }]
 * /prodi/jadwal-ujian/{jadwalKuliahId}:
 *   put:
 *     summary: Isi status (ONLINE/OFFLINE), sifat & tanggal ujian satu kelas untuk jenis ujian tertentu
 *     tags: [JadwalUjian]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/',
  authorize(CODE, ACTION.READ),
  catchAsync(async (req, res) => {
    const { data, meta, jenisUjian, tahunAjaran } = await service.listJadwalUjian(req.query, await service.jadwalIdsScope(req.query.jurusanId));
    sendResponse(res, 200, { message: 'Jadwal ujian fetched', data: { items: data, jenisUjian, tahunAjaran, sifatOptions: service.SIFAT_UJIAN }, meta });
  })
);
router.get(
  '/export',
  authorize(CODE, ACTION.READ),
  catchAsync(async (req, res) => {
    const { workbook, filename } = await service.exportJadwalUjian(req.query, await service.jadwalIdsScope(req.query.jurusanId));
    await sendWorkbook(res, workbook, filename);
  })
);
router.put(
  '/:jadwalKuliahId',
  authorize(CODE, ACTION.UPDATE),
  validate(simpanJadwalUjian),
  catchAsync(async (req, res) => {
    const ids = await service.jadwalIdsScope(req.query.jurusanId);
    await service.simpanJadwalUjian(Number(req.params.jadwalKuliahId), req.body, ids, { userId: req.user.id });
    sendResponse(res, 200, { message: 'Jadwal ujian disimpan' });
  })
);

module.exports = router;
