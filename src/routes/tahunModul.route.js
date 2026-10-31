const Joi = require('joi');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/tahunModul.service');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

/**
 * @swagger
 * tags:
 *   name: TahunModul
 *   description: Tahun Ajaran PMB (/tahun-pmb) & Tahun Ajaran Keuangan (/tahun-keuangan) — CRUD + aktifkan, terpisah dari tahun akademik
 * /tahun-pmb:
 *   get: { summary: List tahun ajaran PMB (search, isActive), tags: [TahunModul], security: [{ bearerAuth: [] }] }
 *   post: { summary: Tambah tahun ajaran PMB, tags: [TahunModul], security: [{ bearerAuth: [] }] }
 * /tahun-pmb/{id}:
 *   put: { summary: Ubah tahun ajaran PMB, tags: [TahunModul], security: [{ bearerAuth: [] }] }
 *   delete: { summary: Hapus (soft) tahun ajaran PMB, tags: [TahunModul], security: [{ bearerAuth: [] }] }
 * /tahun-pmb/{id}/aktifkan:
 *   post: { summary: Jadikan tahun ajaran PMB aktif, tags: [TahunModul], security: [{ bearerAuth: [] }] }
 * /tahun-keuangan:
 *   get: { summary: List tahun ajaran keuangan, tags: [TahunModul], security: [{ bearerAuth: [] }] }
 *   post: { summary: Tambah tahun ajaran keuangan, tags: [TahunModul], security: [{ bearerAuth: [] }] }
 * /tahun-keuangan/{id}:
 *   put: { summary: Ubah tahun ajaran keuangan, tags: [TahunModul], security: [{ bearerAuth: [] }] }
 *   delete: { summary: Hapus (soft) tahun ajaran keuangan, tags: [TahunModul], security: [{ bearerAuth: [] }] }
 * /tahun-keuangan/{id}/aktifkan:
 *   post: { summary: Jadikan tahun ajaran keuangan aktif, tags: [TahunModul], security: [{ bearerAuth: [] }] }
 */
const tahun = Joi.number().integer().min(2000).max(2100);
const createSchema = Joi.object({
  nama: Joi.string().max(20).required(),
  tahunMulai: tahun.required(),
  tahunSelesai: tahun.required(),
  jenisSemester: Joi.string().valid('GANJIL', 'GENAP').required(),
  isActive: Joi.boolean(),
});
const updateSchema = Joi.object({ nama: Joi.string().max(20), tahunMulai: tahun, tahunSelesai: tahun, jenisSemester: Joi.string().valid('GANJIL', 'GENAP'), isActive: Joi.boolean() }).min(1);

/** modul = pmb | keuangan; `bacaJuga` = menu lain yang boleh membaca daftar (mis. form Gelombang memilih Tahun PMB). */
const buatRouter = (modul, kodeMenu, bacaJuga) => {
  const router = require('express').Router();
  router.use(authenticate);
  const ok = (code, message, fn) => catchAsync(async (req, res) => sendResponse(res, code, { message, data: await fn(req) }));
  router.get('/', authorize([kodeMenu, ...bacaJuga], ACTION.READ), catchAsync(async (req, res) => {
    const { data, meta } = await service.list(modul, req.query);
    sendResponse(res, 200, { message: 'Tahun fetched', data, meta });
  }));
  router.get('/:id', authorize([kodeMenu, ...bacaJuga], ACTION.READ), ok(200, 'Tahun fetched', (req) => service.getById(modul, req.params.id)));
  router.post('/', authorize(kodeMenu, ACTION.CREATE), validate(createSchema), ok(201, 'Tahun ditambahkan', (req) => service.create(modul, req.body, req.user.id)));
  router.put('/:id', authorize(kodeMenu, ACTION.UPDATE), validate(updateSchema), ok(200, 'Tahun diperbarui', (req) => service.update(modul, req.params.id, req.body, req.user.id)));
  router.delete('/:id', authorize(kodeMenu, ACTION.DELETE), ok(200, 'Tahun dihapus', (req) => service.remove(modul, req.params.id, req.user.id)));
  router.post('/:id/aktifkan', authorize(kodeMenu, ACTION.UPDATE), ok(200, 'Tahun diaktifkan', (req) => service.activate(modul, req.params.id, req.user.id)));
  return router;
};

module.exports = {
  pmb: buatRouter('pmb', MENU.ADMIN_MASTER_TAHUN_PMB_MANAGEMENT, [MENU.GELOMBANG_MANAGEMENT, MENU.CALON_MAHASISWA_MANAGEMENT]),
  keuangan: buatRouter('keuangan', MENU.ADMIN_MASTER_TAHUN_KEUANGAN_MANAGEMENT, [MENU.KEUANGAN_DASHBOARD]),
};
