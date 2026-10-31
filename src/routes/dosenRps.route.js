const express = require('express');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const authenticateDosen = require('../middlewares/dosenAuth.middleware');
const ACTION = require('../constants/actions');
const { buildRpsRouter } = require('./rps.route');
const service = require('../services/dosenMataKuliah.service');

/**
 * @swagger
 * tags:
 *   name: DosenRps
 *   description: Portal Dosen → Perkuliahan → Mata Kuliah & RPS (endpoint RPS sama dengan /prodi/rps)
 * /dosen-portal/rps/daftar-mata-kuliah:
 *   get:
 *     summary: Mata kuliah yang diajar dosen pada tahun akademik terpilih (header X-Tahun-Ajaran-Id) + status aktif & akses RPS
 *     tags: [DosenRps]
 *     security: [{ bearerAuth: [] }]
 * /dosen-portal/rps/tahun-ajaran:
 *   get:
 *     summary: Pilihan periode ("Berlaku Sejak Periode") halaman RPS
 *     tags: [DosenRps]
 *     security: [{ bearerAuth: [] }]
 * /dosen-portal/rps/{mataKuliahId}:
 *   get:
 *     summary: Detail RPS (sama dengan /prodi/rps/{id}) + akses dosen (bisaUbah, alasan). Lihat = dosen mengajar MK; ubah = koordinator MK
 *       di tahun akademik terpilih & Setting Prodi "Dosen Bisa Isi Persentase Komponen?" = Ya
 *     tags: [DosenRps]
 *     security: [{ bearerAuth: [] }]
 */
const router = express.Router();
router.use(authenticateDosen);

router.get(
  '/daftar-mata-kuliah',
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Mata kuliah fetched', data: await service.listMataKuliah(req.dosen.id, req.tahunAjaranId) }))
);
router.get(
  '/tahun-ajaran',
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Tahun ajaran fetched', data: await service.listTahunAjaran() }))
);

/** Hak akses per aksi pada mata kuliah di URL (dan mata kuliah sumber saat salin data). */
const can = (action) =>
  catchAsync(async (req, res, next) => {
    const mkId = Number(req.params.mataKuliahId);
    if (!mkId) return next();
    const akses = await service.aksesRps(req.dosen.id, mkId, req.tahunAjaranId);
    if (!akses.mengajar) throw new ApiError(403, akses.alasan);
    if (action !== ACTION.READ && !akses.bisaUbah) throw new ApiError(403, akses.alasan);
    const sumber = Number(req.body?.dariMataKuliahId);
    if (sumber && sumber !== mkId && !(await service.aksesRps(req.dosen.id, sumber, req.tahunAjaranId)).mengajar) {
      throw new ApiError(403, 'Anda tidak mengajar mata kuliah sumber');
    }
    req.aksesRps = akses;
    next();
  });

router.use(
  buildRpsRouter({
    can,
    // Kepemilikan sudah dicek lewat `can` (dosen mengajar MK), bukan lewat prodi.
    scope: () => null,
    listMataKuliah: (req) => service.opsiMataKuliah(req.dosen.id),
    decorateDetail: (req, data) => ({ ...data, aksesDosen: req.aksesRps }),
  })
);

module.exports = router;
