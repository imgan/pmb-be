const express = require('express');
const Joi = require('joi');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const { sendWorkbook } = require('../utils/excel');
const service = require('../services/rps.service');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

/**
 * @swagger
 * tags:
 *   name: RpsMataKuliah
 *   description: RPS per mata kuliah (Matakuliah Aktif) — Pemetaan CPL & CPMK, Detail RPS, Rencana Pembelajaran & Evaluasi (dibatasi prodi sesi)
 * /prodi/rps/mata-kuliah:
 *   get:
 *     summary: Pilihan mata kuliah (Cari Mata Kuliah)
 *     tags: [RpsMataKuliah]
 *     security: [{ bearerAuth: [] }]
 * /prodi/rps/{mataKuliahId}:
 *   get:
 *     summary: Detail RPS mata kuliah (info MK, CPL, CPMK, pemetaan, periode berisi data)
 *     tags: [RpsMataKuliah]
 *     security: [{ bearerAuth: [] }]
 * /prodi/rps/{mataKuliahId}/periode/{tahunAjaranId}:
 *   get:
 *     summary: Detail RPS, rencana pembelajaran & rencana evaluasi satu periode
 *     tags: [RpsMataKuliah]
 *     security: [{ bearerAuth: [] }]
 *   put:
 *     summary: Simpan Detail RPS satu periode
 *     tags: [RpsMataKuliah]
 *     security: [{ bearerAuth: [] }]
 */
const id = (req, key = 'mataKuliahId') => Number(req.params[key]);

const wajib = (label) => ({ 'any.required': `${label} wajib diisi`, 'string.empty': `${label} wajib diisi`, 'number.base': `${label} wajib diisi` });
const teksOpsional = Joi.string().trim().allow('', null);

const cpmkSchema = Joi.object({
  kode: Joi.string().trim().max(20).required().messages(wajib('Kode')),
  deskripsi: Joi.string().trim().required().messages(wajib('Deskripsi')),
  deskripsiEn: teksOpsional,
  // Terisi = Sub-CPMK milik CPMK induk tsb.
  parentId: Joi.number().integer().allow(null),
});
// Simpan seluruh tabel Pemetaan CPMK: key = id lama atau kunci sementara baris baru.
const pemetaanCpmkSchema = Joi.object({
  level: Joi.string().valid('CPMK', 'SUB_CPMK').default('CPMK'),
  metode: Joi.string().valid('MANUAL', 'OTOMATIS').default('OTOMATIS'),
  cpmk: Joi.array()
    .items(
      Joi.object({
        key: Joi.alternatives(Joi.string(), Joi.number()).required(),
        id: Joi.number().integer().allow(null),
        parentKey: Joi.alternatives(Joi.string(), Joi.number()).allow(null, ''),
        kode: Joi.string().trim().max(20).required().messages(wajib('Kode CPMK')),
        deskripsi: Joi.string().trim().required().messages(wajib('Deskripsi CPMK')),
        deskripsiEn: teksOpsional,
      })
    )
    .required(),
  pairs: Joi.array()
    .items(
      Joi.object({
        cpmkKey: Joi.alternatives(Joi.string(), Joi.number()).required(),
        cplId: Joi.number().integer().required(),
        bobot: Joi.number().min(0).max(100).allow(null),
      })
    )
    .required(),
});
const rpsSchema = Joi.object({
  deskripsi: teksOpsional,
  bahanKajian: teksOpsional,
  pustakaUtama: teksOpsional,
  pustakaPendukung: teksOpsional,
  mediaSoftware: teksOpsional,
  mediaHardware: teksOpsional,
  mkPrasyarat: Joi.string().trim().max(255).allow('', null),
  dosenPengembang: Joi.string().trim().max(255).allow('', null),
  koordinatorRmk: Joi.string().trim().max(255).allow('', null),
  teamTeaching: teksOpsional,
  tanggalPenyusunan: Joi.date().iso().allow('', null),
});
const pertemuanSchema = Joi.object({
  tahunAjaranId: Joi.number().integer(),
  sesi: Joi.number().integer().min(1).max(99).required().messages(wajib('Pertemuan (sesi) ke')),
  jenisPertemuan: Joi.string()
    .valid(...service.JENIS_PERTEMUAN)
    .required()
    .messages({ ...wajib('Jenis pertemuan'), 'any.only': 'Jenis pertemuan tidak valid' }),
  cpmkIds: Joi.array().items(Joi.number().integer()).default([]),
  materi: Joi.string().trim().required().messages(wajib('Materi perkuliahan (IND)')),
  materiEn: teksOpsional,
  indikator: teksOpsional,
  kriteriaPenilaian: teksOpsional,
  bentukPembelajaran: Joi.string().valid('LURING', 'DARING', 'HYBRID').allow(null, ''),
  metodePembelajaran: teksOpsional,
  waktu: Joi.string().trim().max(100).allow('', null),
  bobot: Joi.number().min(0).max(100).allow(null, ''),
  referensi: teksOpsional,
});
// Simpan seluruh tabel Komponen Evaluasi satu periode: key = id lama atau kunci sementara baris baru.
const kunci = Joi.alternatives(Joi.string(), Joi.number());
const evaluasiSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        key: kunci.required(),
        id: Joi.number().integer().allow(null),
        parentKey: kunci.allow(null, ''),
        metode: Joi.string()
          .valid(...service.METODE_EVALUASI)
          .allow(null, '')
          .messages({ 'any.only': 'Metode evaluasi tidak valid' }),
        jenisEvaluasi: teksOpsional,
        bobot: Joi.number().min(0).max(100).allow(null, ''),
      })
    )
    .required(),
  cells: Joi.array()
    .items(Joi.object({ evalKey: kunci.required(), cpmkId: Joi.number().integer().required(), bobot: Joi.number().min(0).max(100).allow(null) }))
    .required(),
});
const salinPeriodeSchema = Joi.object({
  dariMataKuliahId: Joi.number().integer().allow(null),
  dariTahunAjaranId: Joi.number().integer().required().messages(wajib('Periode sumber')),
  tahunAjaranId: Joi.number().integer().required().messages(wajib('Periode tujuan')),
});
const tahunAjaranWajib = (req, res, next) => (req.body.tahunAjaranId ? next() : res.status(400).json({ success: false, message: 'Periode akademik wajib dipilih' }));

/**
 * Router RPS yang dipakai bersama Prodi & portal Dosen. Autentikasi dipasang pemanggil.
 * - can(action)        : middleware hak akses per aksi (READ/CREATE/UPDATE/DELETE)
 * - scope(req)         : jurusanId pembatas prodi untuk service (null = tanpa batas prodi)
 * - listMataKuliah(req): pilihan "Cari Mata Kuliah"
 * - decorateDetail     : tambahan data pada GET /:mataKuliahId (mis. akses dosen)
 */
const buildRpsRouter = ({ can, scope, listMataKuliah, decorateDetail = (req, data) => data }) => {
  const router = express.Router();
  router.get(
    '/mata-kuliah',
    can(ACTION.READ),
    catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Mata kuliah fetched', data: await listMataKuliah(req) }))
  );
  router.get('/template-pertemuan', can(ACTION.READ), catchAsync(async (req, res) => sendWorkbook(res, service.templatePertemuan(), 'template-rencana-pembelajaran.xlsx')));
  router.get(
    '/:mataKuliahId',
    can(ACTION.READ),
    catchAsync(async (req, res) => sendResponse(res, 200, { message: 'RPS fetched', data: await decorateDetail(req, await service.getDetail(id(req), scope(req))) }))
  );
  router.get(
    '/:mataKuliahId/periode/:tahunAjaranId',
    can(ACTION.READ),
    catchAsync(async (req, res) => sendResponse(res, 200, { message: 'RPS periode fetched', data: await service.getPeriode(id(req), id(req, 'tahunAjaranId'), scope(req)) }))
  );
  router.put(
    '/:mataKuliahId/periode/:tahunAjaranId',
    can(ACTION.UPDATE),
    validate(rpsSchema),
    catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Detail RPS disimpan', data: await service.saveRps(id(req), id(req, 'tahunAjaranId'), req.body, scope(req)) }))
  );
  router.put(
    '/:mataKuliahId/periode/:tahunAjaranId/evaluasi',
    can(ACTION.UPDATE),
    validate(evaluasiSchema),
    catchAsync(async (req, res) =>
      sendResponse(res, 200, { message: 'Rencana evaluasi disimpan', data: await service.saveEvaluasi(id(req), id(req, 'tahunAjaranId'), req.body, scope(req)) })
    )
  );

  // Pemetaan CPL & CPMK
  router.put(
    '/:mataKuliahId/cpl',
    can(ACTION.UPDATE),
    validate(Joi.object({ cplIds: Joi.array().items(Joi.number().integer()).required() })),
    catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Pemetaan CPL disimpan', data: await service.saveCpl(id(req), req.body.cplIds, scope(req)) }))
  );
  router.put(
    '/:mataKuliahId/pemetaan-cpmk',
    can(ACTION.UPDATE),
    validate(pemetaanCpmkSchema),
    catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Pemetaan CPMK disimpan', data: await service.savePemetaanCpmk(id(req), req.body, scope(req)) }))
  );
  router.post(
    '/:mataKuliahId/cpmk/salin',
    can(ACTION.CREATE),
    validate(Joi.object({ dariMataKuliahId: Joi.number().integer().required().messages(wajib('Mata kuliah sumber')) })),
    catchAsync(async (req, res) => {
      const data = await service.salinCpmk(id(req), req.body.dariMataKuliahId, scope(req));
      sendResponse(res, 200, { message: `${data.disalin} CPMK disalin${data.dilewati ? `, ${data.dilewati} dilewati (kode sudah ada)` : ''}`, data });
    })
  );
  router.post(
    '/:mataKuliahId/cpmk',
    can(ACTION.CREATE),
    validate(cpmkSchema),
    catchAsync(async (req, res) => sendResponse(res, 201, { message: 'CPMK ditambahkan', data: await service.saveCpmk(id(req), req.body, scope(req)) }))
  );
  router.put(
    '/:mataKuliahId/cpmk/:id',
    can(ACTION.UPDATE),
    validate(cpmkSchema),
    catchAsync(async (req, res) => sendResponse(res, 200, { message: 'CPMK diperbarui', data: await service.saveCpmk(id(req), req.body, scope(req), id(req, 'id')) }))
  );
  router.delete(
    '/:mataKuliahId/cpmk/:id',
    can(ACTION.DELETE),
    catchAsync(async (req, res) => {
      await service.deleteCpmk(id(req), id(req, 'id'), scope(req));
      sendResponse(res, 200, { message: 'CPMK dihapus' });
    })
  );

  // Rencana Pembelajaran (salin, import, CRUD) & Rencana Evaluasi (salin)
  const JENIS_PERIODE = { pertemuan: 'Rencana pembelajaran', evaluasi: 'Rencana evaluasi' };
  const jenisValid = (req, res, next) => (JENIS_PERIODE[req.params.jenis] ? next() : res.status(404).json({ success: false, message: 'Tidak ditemukan' }));
  router.post(
    '/:mataKuliahId/:jenis/salin',
    jenisValid,
    can(ACTION.CREATE),
    validate(salinPeriodeSchema),
    catchAsync(async (req, res) => {
      const data = await service.salinPeriode(req.params.jenis, id(req), req.body, scope(req));
      sendResponse(res, 200, { message: `${data.disalin} data disalin${data.dilewati ? `, ${data.dilewati} dilewati (sesi sudah ada)` : ''}`, data });
    })
  );
  router.post(
    '/:mataKuliahId/pertemuan/import',
    can(ACTION.CREATE),
    validate(Joi.object({ tahunAjaranId: Joi.number().integer().required().messages(wajib('Periode')), file: Joi.string().required().messages(wajib('File')) })),
    catchAsync(async (req, res) => {
      const data = await service.importPertemuan(id(req), req.body.tahunAjaranId, req.body.file, scope(req));
      sendResponse(res, 200, { message: `Import selesai: ${data.successCount} berhasil, ${data.errorCount} gagal`, data });
    })
  );
  // CRUD per baris hanya untuk rencana pembelajaran; rencana evaluasi disimpan sekaligus per periode.
  const SAVE = { pertemuan: service.savePertemuan };
  const HAPUS = { pertemuan: service.deletePertemuan };
  const crudValid = (req, res, next) => (SAVE[req.params.jenis] ? next() : res.status(404).json({ success: false, message: 'Tidak ditemukan' }));
  const validateJenis = validate(pertemuanSchema);
  router.post(
    '/:mataKuliahId/:jenis',
    crudValid,
    can(ACTION.CREATE),
    validateJenis,
    tahunAjaranWajib,
    catchAsync(async (req, res) => sendResponse(res, 201, { message: `${JENIS_PERIODE[req.params.jenis]} ditambahkan`, data: await SAVE[req.params.jenis](id(req), req.body, scope(req)) }))
  );
  router.put(
    '/:mataKuliahId/:jenis/:id',
    crudValid,
    can(ACTION.UPDATE),
    validateJenis,
    catchAsync(async (req, res) =>
      sendResponse(res, 200, { message: `${JENIS_PERIODE[req.params.jenis]} diperbarui`, data: await SAVE[req.params.jenis](id(req), req.body, scope(req), id(req, 'id')) })
    )
  );
  router.delete(
    '/:mataKuliahId/:jenis/:id',
    crudValid,
    can(ACTION.DELETE),
    catchAsync(async (req, res) => {
      await HAPUS[req.params.jenis](id(req), id(req, 'id'), scope(req));
      sendResponse(res, 200, { message: `${JENIS_PERIODE[req.params.jenis]} dihapus` });
    })
  );

  return router;
};

// Prodi: RPS dibuka dari Matakuliah Aktif maupun Perkuliahan → Mata Kuliah.
const CODE = [MENU.PRODI_MATAKULIAH_AKTIF_MANAGEMENT, MENU.PRODI_PERKULIAHAN_MATA_KULIAH_MANAGEMENT];
const prodiRouter = express.Router();
prodiRouter.use(authenticate);
prodiRouter.use(
  buildRpsRouter({
    can: (action) => authorize(CODE, action),
    scope: (req) => req.query.jurusanId,
    listMataKuliah: (req) => service.listMataKuliah(req.query),
  })
);

module.exports = prodiRouter;
module.exports.buildRpsRouter = buildRpsRouter;
