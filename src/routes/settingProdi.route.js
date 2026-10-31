const router = require('express').Router();
const Joi = require('joi');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/settingProdi.service');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

/**
 * @swagger
 * tags:
 *   name: SettingProdi
 *   description: Setting Program Studi per periode — KRS & Validasi, KHS & Nilai, Ujian, Lain-lain (dibatasi prodi sesi)
 * /prodi/setting:
 *   get:
 *     summary: Daftar setting prodi (periode terbaru di atas)
 *     tags: [SettingProdi]
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     summary: Tambah setting prodi untuk satu periode
 *     tags: [SettingProdi]
 *     security: [{ bearerAuth: [] }]
 * /prodi/setting/{id}:
 *   get:
 *     summary: Detail setting prodi + pilihan kurikulum mahasiswa baru
 *     tags: [SettingProdi]
 *     security: [{ bearerAuth: [] }]
 *   put:
 *     summary: Ubah setting prodi
 *     tags: [SettingProdi]
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     summary: Hapus setting prodi
 *     tags: [SettingProdi]
 *     security: [{ bearerAuth: [] }]
 */
router.use(authenticate);
const CODE = MENU.PRODI_SETTING_MANAGEMENT;

const tgl = Joi.date().iso().allow(null, '');
const persen = Joi.number().integer().min(0).max(100).allow(null, '');
const isian = {
  kurikulumMahasiswaBaruId: Joi.number().integer().allow(null, ''),
  bukaKrs: Joi.boolean(),
  tanggalAwalKrs: tgl,
  tanggalAkhirKrs: tgl,
  tanggalAwalPerubahanKrs: tgl,
  tanggalAkhirPerubahanKrs: tgl,
  wajibValidasiPa: Joi.boolean(),
  cekTagihanKrs: Joi.boolean(),
  maksSks: Joi.number().integer().min(1).max(40).allow(null, ''),
  bukaKhs: Joi.boolean(),
  tanggalAwalKhs: tgl,
  tanggalAkhirKhs: tgl,
  tanggalCetakKhs: tgl,
  bukaPengisianNilai: Joi.boolean(),
  dosenIsiPersentaseKomponen: Joi.boolean(),
  tanggalAwalPengisianNilai: tgl,
  tanggalAkhirPengisianNilai: tgl,
  bukaCetakKartuUjian: Joi.boolean(),
  cekTagihanUjian: Joi.boolean(),
  minKehadiranUts: persen,
  minKehadiranUas: persen,
  keterangan: Joi.string().trim().allow('', null),
};
const createSchema = Joi.object({
  jurusanId: Joi.number().integer().required().messages({ 'any.required': 'Program studi wajib dipilih' }),
  tahunAjaranId: Joi.number().integer().required().messages({ 'any.required': 'Periode wajib dipilih' }),
  ...isian,
});
const updateSchema = Joi.object(isian);

router.get(
  '/',
  authorize(CODE, ACTION.READ),
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Setting prodi fetched', data: await service.list(req.query) }))
);
router.get(
  '/:id',
  authorize(CODE, ACTION.READ),
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Setting prodi fetched', data: await service.detail(Number(req.params.id), req.query.jurusanId) }))
);
router.post(
  '/',
  authorize(CODE, ACTION.CREATE),
  validate(createSchema),
  catchAsync(async (req, res) =>
    sendResponse(res, 201, { message: 'Setting Program Studi ditambahkan', data: await service.create(req.body, req.user.id, req.query.jurusanId) })
  )
);
router.put(
  '/:id',
  authorize(CODE, ACTION.UPDATE),
  validate(updateSchema),
  catchAsync(async (req, res) =>
    sendResponse(res, 200, {
      message: 'Pengubahan data Setting Program Studi berhasil',
      data: await service.update(Number(req.params.id), req.body, req.user.id, req.query.jurusanId),
    })
  )
);
router.delete(
  '/:id',
  authorize(CODE, ACTION.DELETE),
  catchAsync(async (req, res) => {
    await service.remove(Number(req.params.id), req.query.jurusanId);
    sendResponse(res, 200, { message: 'Setting Program Studi dihapus' });
  })
);

module.exports = router;
