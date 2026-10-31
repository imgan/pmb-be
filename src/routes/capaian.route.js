const router = require('express').Router();
const Joi = require('joi');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const { sendWorkbook } = require('../utils/excel');
const service = require('../services/capaian.service');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

/**
 * @swagger
 * tags:
 *   name: ManajemenCapaian
 *   description: Manajemen Capaian (OBE) per kurikulum — Profil Lulusan, CPL, pemetaan PL→CPL & CPL→MK (dibatasi prodi sesi)
 */
router.use(authenticate);
const CODE = MENU.PRODI_MANAJEMEN_CAPAIAN_MANAGEMENT;

const itemSchema = (aspek) =>
  Joi.object({
    kode: Joi.string().trim().max(20).required().messages({ 'any.required': 'Kode wajib diisi', 'string.empty': 'Kode wajib diisi' }),
    deskripsi: Joi.string().trim().required().messages({ 'any.required': 'Deskripsi wajib diisi', 'string.empty': 'Deskripsi wajib diisi' }),
    deskripsiEn: Joi.string().trim().allow('', null),
    ...(aspek
      ? {
          aspek: Joi.string().valid(...service.ASPEK_CPL).allow(null, ''),
          // Terisi = Indikator Kinerja (IK) milik CPL induk tsb.
          parentId: Joi.number().integer().allow(null),
        }
      : {
          nama: Joi.string().trim().max(200).required().messages({ 'any.required': 'Profil lulusan wajib diisi', 'string.empty': 'Profil lulusan wajib diisi' }),
          profesi: Joi.string().trim().allow('', null),
        }),
  });
const plCplSchema = Joi.object({
  metode: Joi.string().valid('MANUAL', 'OTOMATIS').default('OTOMATIS'),
  pairs: Joi.array()
    .items(
      Joi.object({
        profilLulusanId: Joi.number().integer().required(),
        cplId: Joi.number().integer().required(),
        bobot: Joi.number().min(0).max(100).allow(null),
      })
    )
    .required(),
});
const cplMkSchema = Joi.object({
  level: Joi.string().valid('CPL', 'IK').default('CPL'),
  pairs: Joi.array().items(Joi.object({ cplId: Joi.number().integer().required(), mataKuliahId: Joi.number().integer().required() })).required(),
});

/**
 * @swagger
 * /prodi/capaian:
 *   get:
 *     summary: Daftar kurikulum + status pengisian capaian (filter tahunKurikulum, jenjang, jurusanId, jenis OBE|NON_OBE)
 *     tags: [ManajemenCapaian]
 *     security: [{ bearerAuth: [] }]
 * /prodi/capaian/filter-options:
 *   get:
 *     summary: Pilihan tahun kurikulum & jenjang
 *     tags: [ManajemenCapaian]
 *     security: [{ bearerAuth: [] }]
 * /prodi/capaian/laporan:
 *   get:
 *     summary: Cetak laporan status pengisian (Excel)
 *     tags: [ManajemenCapaian]
 *     security: [{ bearerAuth: [] }]
 * /prodi/capaian/{kurikulumId}:
 *   get:
 *     summary: Detail capaian satu kurikulum (PL, CPL, MK, pemetaan)
 *     tags: [ManajemenCapaian]
 *     security: [{ bearerAuth: [] }]
 * /prodi/capaian/{kurikulumId}/{jenis}:
 *   post:
 *     summary: Tambah Profil Lulusan (jenis=pl) atau CPL (jenis=cpl)
 *     tags: [ManajemenCapaian]
 *     security: [{ bearerAuth: [] }]
 * /prodi/capaian/{kurikulumId}/{jenis}/salin:
 *   post:
 *     summary: Salin PL / CPL dari kurikulum lain (dariKurikulumId); kode yang sudah ada dilewati
 *     tags: [ManajemenCapaian]
 *     security: [{ bearerAuth: [] }]
 * /prodi/capaian/{kurikulumId}/{jenis}/{id}:
 *   put:
 *     summary: Ubah PL / CPL
 *     tags: [ManajemenCapaian]
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     summary: Hapus PL / CPL (pemetaannya ikut terhapus)
 *     tags: [ManajemenCapaian]
 *     security: [{ bearerAuth: [] }]
 * /prodi/capaian/{kurikulumId}/pemetaan/pl-cpl:
 *   put:
 *     summary: Simpan seluruh pemetaan PL → CPL kurikulum (metode MANUAL/OTOMATIS + pairs berbobot)
 *     tags: [ManajemenCapaian]
 *     security: [{ bearerAuth: [] }]
 * /prodi/capaian/{kurikulumId}/pemetaan/cpl-mk:
 *   put:
 *     summary: Simpan seluruh pemetaan CPL → mata kuliah kurikulum (pairs)
 *     tags: [ManajemenCapaian]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/',
  authorize(CODE, ACTION.READ),
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Manajemen capaian fetched', data: await service.listCapaian(req.query) }))
);
router.get(
  '/filter-options',
  authorize(CODE, ACTION.READ),
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Filter fetched', data: await service.getFilterOptions() }))
);
router.get(
  '/laporan',
  authorize(CODE, ACTION.READ),
  catchAsync(async (req, res) => sendWorkbook(res, await service.exportLaporan(req.query), 'laporan-manajemen-capaian.xlsx'))
);
router.put(
  '/:kurikulumId/pemetaan/pl-cpl',
  authorize(CODE, ACTION.UPDATE),
  validate(plCplSchema),
  catchAsync(async (req, res) => {
    const data = await service.savePlCpl(Number(req.params.kurikulumId), req.body, req.query.jurusanId);
    sendResponse(res, 200, { message: 'Pemetaan PL → CPL disimpan', data });
  })
);
router.put(
  '/:kurikulumId/pemetaan/cpl-mk',
  authorize(CODE, ACTION.UPDATE),
  validate(cplMkSchema),
  catchAsync(async (req, res) => {
    const data = await service.saveCplMk(Number(req.params.kurikulumId), req.body, req.query.jurusanId);
    sendResponse(res, 200, { message: 'Pemetaan CPL → mata kuliah disimpan', data });
  })
);
router.post(
  '/:kurikulumId/:jenis/salin',
  (req, res, next) => (['pl', 'cpl'].includes(req.params.jenis) ? next() : res.status(404).json({ success: false, message: 'Tidak ditemukan' })),
  authorize(CODE, ACTION.CREATE),
  validate(Joi.object({ dariKurikulumId: Joi.number().integer().required().messages({ 'any.required': 'Kurikulum sumber wajib dipilih' }) })),
  catchAsync(async (req, res) => {
    const data = await service.salinItem(req.params.jenis, Number(req.params.kurikulumId), req.body.dariKurikulumId, req.query.jurusanId);
    sendResponse(res, 200, { message: `${data.disalin} data disalin${data.dilewati ? `, ${data.dilewati} dilewati (kode sudah ada)` : ''}`, data });
  })
);
router.get(
  '/:kurikulumId',
  authorize(CODE, ACTION.READ),
  catchAsync(async (req, res) =>
    sendResponse(res, 200, { message: 'Detail capaian fetched', data: await service.getDetail(Number(req.params.kurikulumId), req.query.jurusanId) })
  )
);

const jenisValid = (req, res, next) => (['pl', 'cpl'].includes(req.params.jenis) ? next() : res.status(404).json({ success: false, message: 'Tidak ditemukan' }));
const validateItem = (req, res, next) => validate(itemSchema(req.params.jenis === 'cpl'))(req, res, next);

router.post(
  '/:kurikulumId/:jenis',
  jenisValid,
  authorize(CODE, ACTION.CREATE),
  validateItem,
  catchAsync(async (req, res) => {
    const data = await service.saveItem(req.params.jenis, Number(req.params.kurikulumId), req.body, req.query.jurusanId);
    sendResponse(res, 201, { message: 'Data ditambahkan', data });
  })
);
router.put(
  '/:kurikulumId/:jenis/:id',
  jenisValid,
  authorize(CODE, ACTION.UPDATE),
  validateItem,
  catchAsync(async (req, res) => {
    const data = await service.saveItem(req.params.jenis, Number(req.params.kurikulumId), req.body, req.query.jurusanId, Number(req.params.id));
    sendResponse(res, 200, { message: 'Data diperbarui', data });
  })
);
router.delete(
  '/:kurikulumId/:jenis/:id',
  jenisValid,
  authorize(CODE, ACTION.DELETE),
  catchAsync(async (req, res) => {
    await service.deleteItem(req.params.jenis, Number(req.params.kurikulumId), Number(req.params.id), req.query.jurusanId);
    sendResponse(res, 200, { message: 'Data dihapus' });
  })
);

module.exports = router;
