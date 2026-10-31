const router = require('express').Router();
const Joi = require('joi');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const { sendWorkbook } = require('../utils/excel');
const service = require('../services/lmsConsole.service');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/permission.middleware');
const validate = require('../middlewares/validate.middleware');
const MENU = require('../constants/menuCodes');
const ACTION = require('../constants/actions');

/**
 * @swagger
 * tags:
 *   name: LmsConsole
 *   description: Konsol LMS (modul staf /lms) — pemantauan e-learning seluruh kampus per tahun akademik
 * /lms-console/opsi:
 *   get: { summary: Pilihan tahun akademik & prodi, tags: [LmsConsole], security: [{ bearerAuth: [] }] }
 * /lms-console/dashboard:
 *   get: { summary: Ringkasan, tren 12 minggu, kelas teraktif & aktivitas terbaru, tags: [LmsConsole], security: [{ bearerAuth: [] }] }
 * /lms-console/kelas:
 *   get: { summary: Kelas online + rekap konten & keaktifan (tahunAjaranId, kodeProdi, search, status=ADA|KOSONG), tags: [LmsConsole], security: [{ bearerAuth: [] }] }
 * /lms-console/kelas/{id}:
 *   get: { summary: Detail kelas — konten & progres peserta, tags: [LmsConsole], security: [{ bearerAuth: [] }] }
 * /lms-console/materi:
 *   get: { summary: Materi & video (jenis, status=TERBIT|DRAF), tags: [LmsConsole], security: [{ bearerAuth: [] }] }
 * /lms-console/tugas:
 *   get: { summary: Tugas + pengumpulan & penilaian, tags: [LmsConsole], security: [{ bearerAuth: [] }] }
 * /lms-console/kuis:
 *   get: { summary: Kuis & ujian + pengerjaan & rata skor, tags: [LmsConsole], security: [{ bearerAuth: [] }] }
 * /lms-console/konten/{id}:
 *   get: { summary: Detail konten + status tiap penerima, tags: [LmsConsole], security: [{ bearerAuth: [] }] }
 * /lms-console/konten/{id}/terbit:
 *   patch: { summary: Terbitkan / sembunyikan konten, tags: [LmsConsole], security: [{ bearerAuth: [] }] }
 * /lms-console/forum:
 *   get: { summary: Komentar diskusi konten (peran=DOSEN|MAHASISWA), tags: [LmsConsole], security: [{ bearerAuth: [] }] }
 * /lms-console/forum/{id}:
 *   delete: { summary: Hapus komentar (moderasi), tags: [LmsConsole], security: [{ bearerAuth: [] }] }
 * /lms-console/laporan:
 *   get: { summary: Laporan aktivitas per prodi & per kelas, tags: [LmsConsole], security: [{ bearerAuth: [] }] }
 * /lms-console/laporan/export:
 *   get: { summary: Export Excel laporan aktivitas, tags: [LmsConsole], security: [{ bearerAuth: [] }] }
 */
router.use(authenticate);

const SEMUA_MENU = Object.values(MENU).filter((c) => c.startsWith('LMS_'));
const KONTEN_MENU = [MENU.LMS_MATERI_MANAGEMENT, MENU.LMS_TUGAS_MANAGEMENT, MENU.LMS_KUIS_MANAGEMENT];
const ok = (message, fn) => catchAsync(async (req, res) => sendResponse(res, 200, { message, data: await fn(req) }));

router.get('/opsi', authorize(SEMUA_MENU, ACTION.READ), ok('Opsi LMS fetched', () => service.opsi()));
router.get('/dashboard', authorize(MENU.LMS_DASHBOARD, ACTION.READ), ok('Dashboard LMS fetched', (req) => service.dashboard(req.query)));
router.get('/kelas', authorize(MENU.LMS_KELAS_MANAGEMENT, ACTION.READ), ok('Kelas online fetched', (req) => service.listKelas(req.query)));
router.get('/kelas/:id', authorize([MENU.LMS_KELAS_MANAGEMENT, MENU.LMS_LAPORAN_MANAGEMENT], ACTION.READ), ok('Detail kelas fetched', (req) => service.detailKelas(req.params.id)));

router.get('/materi', authorize(MENU.LMS_MATERI_MANAGEMENT, ACTION.READ), ok('Materi fetched', (req) => service.listKonten(req.query, ['MATERI', 'VIDEO'])));
router.get('/tugas', authorize(MENU.LMS_TUGAS_MANAGEMENT, ACTION.READ), ok('Tugas fetched', (req) => service.listKonten(req.query, ['TUGAS'])));
router.get('/kuis', authorize(MENU.LMS_KUIS_MANAGEMENT, ACTION.READ), ok('Kuis fetched', (req) => service.listKonten(req.query, ['KUIS'])));
router.get('/konten/:id', authorize([...KONTEN_MENU, MENU.LMS_KELAS_MANAGEMENT], ACTION.READ), ok('Detail konten fetched', (req) => service.detailKonten(req.params.id)));
router.patch(
  '/konten/:id/terbit',
  authorize(KONTEN_MENU, ACTION.UPDATE),
  validate(Joi.object({ isPublished: Joi.boolean().required() })),
  ok('Status konten diperbarui', (req) => service.setTerbit(req.params.id, req.body.isPublished))
);

router.get('/forum', authorize(MENU.LMS_FORUM_MANAGEMENT, ACTION.READ), ok('Forum fetched', (req) => service.forum(req.query)));
router.delete(
  '/forum/:id',
  authorize(MENU.LMS_FORUM_MANAGEMENT, ACTION.DELETE),
  ok('Komentar dihapus', (req) => service.hapusKomentar(req.params.id))
);

router.get('/laporan', authorize(MENU.LMS_LAPORAN_MANAGEMENT, ACTION.READ), ok('Laporan LMS fetched', (req) => service.laporan(req.query)));
router.get(
  '/laporan/export',
  authorize(MENU.LMS_LAPORAN_MANAGEMENT, ACTION.READ),
  catchAsync(async (req, res) => sendWorkbook(res, await service.exportLaporan(req.query), 'laporan-aktivitas-lms.xlsx'))
);

module.exports = router;
