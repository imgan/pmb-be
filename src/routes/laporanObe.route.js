const router = require('express').Router();
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');
const service = require('../services/laporanObe.service');
const kampusService = require('../services/kampus.service');
const { buildLaporanObePdf } = require('../services/laporanObePdf.service');

/**
 * @swagger
 * tags:
 *   name: LaporanObe
 *   description: Prodi → Laporan → Laporan OBE (Monitoring OBE) — capaian CPL/CPMK dari Input Nilai OBE (dibatasi prodi sesi)
 * /prodi/laporan-obe/filter-options:
 *   get:
 *     summary: Pilihan jenis laporan, metode, prodi (+ tahun kurikulum & angkatan per prodi)
 *     tags: [LaporanObe]
 *     security: [{ bearerAuth: [] }]
 * /prodi/laporan-obe/mata-kuliah:
 *   get:
 *     summary: Pilihan mata kuliah (CPMK per Mahasiswa) — query kodeProdi, tahunKurikulum
 *     tags: [LaporanObe]
 *     security: [{ bearerAuth: [] }]
 * /prodi/laporan-obe:
 *   get:
 *     summary: Data laporan (query jenis=cpl-prodi|cpl-mahasiswa|cpmk-mk|cpmk-mahasiswa, tahunKurikulum, kodeProdi, angkatan, metode=rerata|progresif, mataKuliahId (cpmk-mahasiswa))
 *     tags: [LaporanObe]
 *     security: [{ bearerAuth: [] }]
 * /prodi/laporan-obe/pdf:
 *   get:
 *     summary: PDF laporan (query sama + kop=1|0)
 *     tags: [LaporanObe]
 *     security: [{ bearerAuth: [] }]
 */
router.use(authenticate);
const CODE = MENU.PRODI_LAPORAN_OBE_MANAGEMENT;

router.get(
  '/filter-options',
  authorize(CODE, ACTION.READ),
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Filter options fetched', data: await service.filterOptions(req.query.jurusanId) }))
);
router.get(
  '/mata-kuliah',
  authorize(CODE, ACTION.READ),
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Mata kuliah fetched', data: await service.opsiMataKuliah(req.query, req.query.jurusanId) }))
);
router.get(
  '/pdf',
  authorize(CODE, ACTION.READ),
  catchAsync(async (req, res) => {
    const [data, kampus] = await Promise.all([service.generate(req.query, req.query.jurusanId), kampusService.getKampus()]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="laporan-obe-${data.konteks.jenis}-${data.konteks.kodeProdi}-${data.konteks.tahunKurikulum}.pdf"`);
    buildLaporanObePdf(data, kampus, { kop: req.query.kop !== '0' }).pipe(res);
  })
);
router.get(
  '/',
  authorize(CODE, ACTION.READ),
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Laporan OBE fetched', data: await service.generate(req.query, req.query.jurusanId) }))
);

module.exports = router;
