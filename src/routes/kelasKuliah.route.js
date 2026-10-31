const router = require('express').Router();
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/kelasKuliah.service');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const { bobotObe } = require('../validations/dosenKelas.validation');
const { simpanJadwalUjian } = require('../validations/jadwalUjian.validation');
const menuService = require('../services/kelasKuliahMenu.service');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

/**
 * @swagger
 * tags:
 *   name: KelasKuliahProdi
 *   description: Prodi → Perkuliahan → Kelas Kuliah — daftar & detail kelas, Komposisi Nilai Kelas (relasi CPMK/RPS)
 * /prodi/kelas-kuliah:
 *   get:
 *     summary: Daftar kelas kuliah (filter tahunAjaranId, search; dibatasi prodi sesi)
 *     tags: [KelasKuliahProdi]
 *     security: [{ bearerAuth: [] }]
 * /prodi/kelas-kuliah/{id}:
 *   get:
 *     summary: Detail kelas (info, dosen, peserta, komposisi nilai, kolom CPMK, usulan dari RPS)
 *     tags: [KelasKuliahProdi]
 *     security: [{ bearerAuth: [] }]
 * /prodi/kelas-kuliah/{id}/jadwal-perkuliahan:
 *   get:
 *     summary: Jadwal Perkuliahan kelas — pertemuan 1..N, rencana RPS vs realisasi mengajar & rekap presensi
 *     tags: [KelasKuliahProdi]
 *     security: [{ bearerAuth: [] }]
 * /prodi/kelas-kuliah/{id}/komposisi:
 *   put:
 *     summary: Simpan Komposisi Nilai Kelas (bobot_obe); nilai yang sudah ada dihitung ulang
 *     tags: [KelasKuliahProdi]
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     summary: Hapus Komposisi Nilai Kelas
 *     tags: [KelasKuliahProdi]
 *     security: [{ bearerAuth: [] }]
 */
router.use(authenticate);
const CODE = MENU.PRODI_KELAS_KULIAH_MANAGEMENT;

router.get(
  '/',
  authorize(CODE, ACTION.READ),
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Kelas kuliah fetched', data: await service.list(req.query) }))
);
router.get(
  '/:id',
  authorize(CODE, ACTION.READ),
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Kelas kuliah fetched', data: await service.detail(Number(req.params.id), req.query.jurusanId) }))
);
router.get(
  '/:id/jadwal-perkuliahan',
  authorize(CODE, ACTION.READ),
  catchAsync(async (req, res) =>
    sendResponse(res, 200, { message: 'Jadwal perkuliahan fetched', data: await service.jadwalPerkuliahan(Number(req.params.id), req.query.jurusanId) })
  )
);
router.put(
  '/:id/komposisi',
  authorize(CODE, ACTION.UPDATE),
  validate(bobotObe),
  catchAsync(async (req, res) => {
    const data = await service.simpanKomposisi(Number(req.params.id), req.body, req.user.id, req.query.jurusanId);
    sendResponse(res, 200, {
      message: data.nilaiDihitungUlang
        ? `Pengubahan komposisi nilai kelas berhasil, ${data.nilaiDihitungUlang} nilai perkuliahan dihitung ulang`
        : 'Pengubahan komposisi nilai kelas berhasil',
      data,
    });
  })
);
router.delete(
  '/:id/komposisi',
  authorize(CODE, ACTION.DELETE),
  catchAsync(async (req, res) => {
    await service.hapusKomposisi(Number(req.params.id), req.query.jurusanId);
    sendResponse(res, 200, { message: 'Komposisi nilai kelas dihapus' });
  })
);

/**
 * @swagger
 * /prodi/kelas-kuliah/{id}/jadwal-ujian:
 *   get:
 *     summary: Jadwal Ujian kelas (UTS & UAS) — data sama dengan menu Jadwal Kuliah → Jadwal Ujian
 *     tags: [KelasKuliahProdi]
 *     security: [{ bearerAuth: [] }]
 *   put:
 *     summary: Simpan isian ujian kelas (jenisUjian, status, sifat, tanggal); tersinkron dengan menu Jadwal Ujian
 *     tags: [KelasKuliahProdi]
 *     security: [{ bearerAuth: [] }]
 * /prodi/kelas-kuliah/{id}/presensi:
 *   get:
 *     summary: Presensi Kelas — matriks peserta × pertemuan (H/I/S/A) + rekap
 *     tags: [KelasKuliahProdi]
 *     security: [{ bearerAuth: [] }]
 * /prodi/kelas-kuliah/{id}/rekap-kuesioner:
 *   get:
 *     summary: Rekap Kuesioner (EDOM) per dosen kelas — responden, rata-rata per pertanyaan, saran
 *     tags: [KelasKuliahProdi]
 *     security: [{ bearerAuth: [] }]
 */
const cekKelas = async (req) => (await service.findJadwal(Number(req.params.id), req.query.jurusanId)).id;
router.get(
  '/:id/jadwal-ujian',
  authorize(CODE, ACTION.READ),
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Jadwal ujian kelas fetched', data: await menuService.jadwalUjianKelas(await cekKelas(req)) }))
);
router.put(
  '/:id/jadwal-ujian',
  // Boleh diubah oleh pemegang hak ubah Kelas Kuliah atau menu Jadwal Ujian prodi.
  authorize([CODE, MENU.PRODI_JADWAL_UJIAN_MANAGEMENT], ACTION.UPDATE),
  validate(simpanJadwalUjian),
  catchAsync(async (req, res) =>
    sendResponse(res, 200, {
      message: 'Jadwal ujian disimpan',
      data: await menuService.simpanJadwalUjianKelas(await cekKelas(req), req.body, { userId: req.user.id }),
    })
  )
);
router.get(
  '/:id/presensi',
  authorize(CODE, ACTION.READ),
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Presensi kelas fetched', data: await menuService.presensiKelas(await cekKelas(req)) }))
);
router.get(
  '/:id/rekap-kuesioner',
  authorize(CODE, ACTION.READ),
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Rekap kuesioner fetched', data: await menuService.rekapKuesioner(await cekKelas(req)) }))
);

module.exports = router;
