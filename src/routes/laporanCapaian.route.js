const router = require('express').Router();
const Joi = require('joi');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const service = require('../services/laporanCapaian.service');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

/**
 * @swagger
 * tags:
 *   name: LaporanCapaian
 *   description: Prodi → Kurikulum → Laporan Capaian OBE (dibatasi prodi sesi)
 * /prodi/laporan-capaian/opsi:
 *   get:
 *     summary: Pilihan kurikulum & angkatan untuk form laporan
 *     tags: [LaporanCapaian]
 *     security: [{ bearerAuth: [] }]
 * /prodi/laporan-capaian/mahasiswa:
 *   get:
 *     summary: Cari mahasiswa prodi kurikulum (kurikulumId, angkatan, search)
 *     tags: [LaporanCapaian]
 *     security: [{ bearerAuth: [] }]
 * /prodi/laporan-capaian/transkrip-obe:
 *   get:
 *     summary: Transkrip OBE (spiderchart & hasil CPL vs target) — per mahasiswa (mahasiswaId) atau rata-rata angkatan
 *     tags: [LaporanCapaian]
 *     security: [{ bearerAuth: [] }]
 * /prodi/laporan-capaian/cpl-mata-kuliah:
 *   get:
 *     summary: Laporan CPL per Mata Kuliah (kurikulumId wajib; mahasiswaId = satu mahasiswa, tanpa = rata-rata angkatan)
 *     tags: [LaporanCapaian]
 *     security: [{ bearerAuth: [] }]
 */
router.use(authenticate);
const CODE = MENU.PRODI_LAPORAN_CAPAIAN_MANAGEMENT;

const laporanQuery = Joi.object({
  kurikulumId: Joi.number().integer().required().messages({ 'any.required': 'Tahun kurikulum wajib dipilih' }),
  angkatan: Joi.number().integer().allow('', null),
  mahasiswaId: Joi.number().integer().allow('', null),
}).unknown(true);
const cekQuery = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.query);
  if (error) return next(new ApiError(400, error.details[0].message));
  next();
};

router.get('/opsi', authorize(CODE, ACTION.READ), catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Opsi laporan fetched', data: await service.opsi(req.query) })));
router.get(
  '/mahasiswa',
  authorize(CODE, ACTION.READ),
  cekQuery(laporanQuery),
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Mahasiswa fetched', data: await service.cariMahasiswa(req.query) }))
);
router.get(
  '/cpl-mata-kuliah',
  authorize(CODE, ACTION.READ),
  cekQuery(laporanQuery),
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Laporan CPL per mata kuliah fetched', data: await service.cplPerMataKuliah(req.query) }))
);

router.get(
  '/transkrip-obe',
  authorize(CODE, ACTION.READ),
  cekQuery(laporanQuery),
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Transkrip OBE fetched', data: await service.transkripObe(req.query) }))
);

module.exports = router;
