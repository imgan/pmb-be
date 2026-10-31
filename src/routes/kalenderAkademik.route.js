const router = require('express').Router();
const Joi = require('joi');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { KalenderAkademik, TahunAjaran } = require('../models');
const service = require('../services/kalenderAkademik.service');
const kampusService = require('../services/kampus.service');
const { sendWorkbook } = require('../utils/excel');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

/**
 * BAAK → Kalender Akademik: kegiatan akademik per tahun akademik (rentang tanggal + kategori).
 */
router.use(authenticate);
const CODE = MENU.BAAK_KALENDER_AKADEMIK_MANAGEMENT;
const KATEGORI = service.KATEGORI_KODE;

const tanggal = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).messages({ 'string.pattern.base': 'Format tanggal YYYY-MM-DD' });
const body = (wajib) => {
  const r = (s) => (wajib ? s.required() : s);
  return Joi.object({
    tahunAjaranId: r(Joi.number().integer()),
    namaKegiatan: r(Joi.string().trim().min(2).max(200)),
    kategori: r(Joi.string().valid(...KATEGORI)),
    tanggalMulai: r(tanggal),
    tanggalSelesai: r(tanggal),
    keterangan: Joi.string().trim().max(2000).allow('', null),
  });
};

const { toJson } = service;

const cekData = async ({ tahunAjaranId, tanggalMulai, tanggalSelesai }) => {
  if (tanggalMulai && tanggalSelesai && tanggalSelesai < tanggalMulai) throw new ApiError(400, 'Tanggal selesai tidak boleh sebelum tanggal mulai');
  if (tahunAjaranId && !(await TahunAjaran.findByPk(tahunAjaranId, { attributes: ['id'] }))) throw new ApiError(404, 'Tahun akademik tidak ditemukan');
};

/**
 * @swagger
 * /kalender-akademik:
 *   get:
 *     summary: Kegiatan kalender akademik (filter tahunAjaranId, kategori), urut tanggal mulai
 *     tags: [KalenderAkademik]
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     summary: Tambah kegiatan
 *     tags: [KalenderAkademik]
 *     security: [{ bearerAuth: [] }]
 * /kalender-akademik/export:
 *   get:
 *     summary: Export Excel kegiatan (filter tahunAjaranId, kategori)
 *     tags: [KalenderAkademik]
 *     security: [{ bearerAuth: [] }]
 * /kalender-akademik/pdf:
 *   get:
 *     summary: Cetak PDF kalender akademik (kop kampus; filter tahunAjaranId, kategori)
 *     tags: [KalenderAkademik]
 *     security: [{ bearerAuth: [] }]
 * /kalender-akademik/{id}:
 *   put:
 *     summary: Ubah kegiatan
 *     tags: [KalenderAkademik]
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     summary: Hapus kegiatan
 *     tags: [KalenderAkademik]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/',
  authorize(CODE, ACTION.READ),
  catchAsync(async (req, res) => {
    sendResponse(res, 200, { message: 'Kalender akademik fetched', data: await service.list(req.query) });
  })
);
router.get(
  '/export',
  authorize(CODE, ACTION.READ),
  catchAsync(async (req, res) => {
    const { workbook, filename } = await service.exportExcel(req.query);
    await sendWorkbook(res, workbook, filename);
  })
);
router.get(
  '/pdf',
  authorize(CODE, ACTION.READ),
  catchAsync(async (req, res) => {
    const { doc, filename } = await service.buildPdf(req.query, await kampusService.getKampus());
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    doc.pipe(res);
  })
);
router.post(
  '/',
  authorize(CODE, ACTION.CREATE),
  validate(body(true)),
  catchAsync(async (req, res) => {
    await cekData(req.body);
    const k = await KalenderAkademik.create({ ...req.body, keterangan: req.body.keterangan || null, createdBy: req.user.id, updatedBy: req.user.id });
    sendResponse(res, 201, { message: 'Kegiatan ditambahkan', data: toJson(k) });
  })
);
router.put(
  '/:id',
  authorize(CODE, ACTION.UPDATE),
  validate(body(false)),
  catchAsync(async (req, res) => {
    const k = await KalenderAkademik.findByPk(Number(req.params.id));
    if (!k) throw new ApiError(404, 'Kegiatan tidak ditemukan');
    const values = { ...req.body };
    if (values.keterangan !== undefined) values.keterangan = values.keterangan || null;
    await cekData({ ...toJson(k), ...values });
    await k.update({ ...values, updatedBy: req.user.id });
    sendResponse(res, 200, { message: 'Kegiatan diperbarui', data: toJson(k) });
  })
);
router.delete(
  '/:id',
  authorize(CODE, ACTION.DELETE),
  catchAsync(async (req, res) => {
    const jumlah = await KalenderAkademik.destroy({ where: { id: Number(req.params.id) } });
    if (!jumlah) throw new ApiError(404, 'Kegiatan tidak ditemukan');
    sendResponse(res, 200, { message: 'Kegiatan dihapus' });
  })
);

module.exports = router;
