const router = require('express').Router();
const dosenAuthController = require('../controllers/dosenAuth.controller');
const dosenPortalController = require('../controllers/dosenPortal.controller');
const dosenKelasController = require('../controllers/dosenKelas.controller');
const { saveNilaiKelas, saveNilaiObe, bobotObe: bobotObeSchema } = require('../validations/dosenKelas.validation');
const nilaiObeService = require('../services/nilaiObe.service');
const kelasKuliahService = require('../services/kelasKuliah.service');
const kelasKuliahMenuService = require('../services/kelasKuliahMenu.service');
const dosenKelasService = require('../services/dosenKelas.service');
const authenticateDosen = require('../middlewares/dosenAuth.middleware');
const academicContextService = require('../services/academicContext.service');
const validate = require('../middlewares/validate.middleware');
const { loginDosen, updatePhotoDosen, changePasswordDosen } = require('../validations/dosenAuth.validation');
const { catatanBimbingan } = require('../validations/bimbinganTa.validation');
const bimbinganTaController = require('../controllers/bimbinganTa.controller');
const dosenDashboardController = require('../controllers/dosenDashboard.controller');
const dosenRekapRealisasiController = require('../controllers/dosenRekapRealisasi.controller');
const referensiJudulController = require('../controllers/referensiJudul.controller');
const dosenMahasiswaPaController = require('../controllers/dosenMahasiswaPa.controller');
const kesediaanMengajarController = require('../controllers/kesediaanMengajar.controller');
const { saveKesediaan } = require('../validations/kesediaanMengajar.validation');
const jadwalUjianService = require('../services/jadwalUjian.service');
const { simpanJadwalUjian } = require('../validations/jadwalUjian.validation');
const catchAsync = require('../utils/catchAsync');
const { Dosen } = require('../models');
const { listPengumumanTayang } = require('../services/pengumuman.service');
const sendResponse = require('../utils/ApiResponse');
const { updateBiodataDosen, riwayatPendidikan } = require('../validations/dosenDashboard.validation');
const {
  createRealisasiMengajar,
  updateRealisasiMengajar,
  startKelas,
  stopKelas,
  savePresensiMahasiswa,
} = require('../validations/dosenRealisasiMengajar.validation');
const { createKoreksiSidang, updateKoreksiSidang } = require('../validations/koreksiSidang.validation');
const { saveNilaiSidang } = require('../validations/nilaiSidang.validation');
const { setujuiMassal } = require('../validations/krs.validation');

/**
 * @swagger
 * tags:
 *   name: DosenPortal
 *   description: Portal self-service Dosen (login mandiri, terpisah dari sistem User/Role admin)
 */

/**
 * @swagger
 * /dosen-portal/login:
 *   post:
 *     summary: Login dosen menggunakan NIDN atau email + password
 *     tags: [DosenPortal]
 *     responses:
 *       200:
 *         description: Login berhasil
 *       401:
 *         description: NIDN/email atau password salah
 */
router.post('/login', validate(loginDosen), dosenAuthController.login);

router.use(authenticateDosen);

/**
 * @swagger
 * /dosen-portal/me:
 *   get:
 *     summary: Get profil dosen yang sedang login
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Profil dosen
 */
router.get('/me', dosenAuthController.me);

/**
 * @swagger
 * /dosen-portal/profile/photo:
 *   put:
 *     summary: Ubah foto profil dosen (data URL gambar base64; kosong = hapus)
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 * /dosen-portal/profile/password:
 *   put:
 *     summary: Ubah password portal dosen (wajib password lama)
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 */
router.put('/profile/photo', validate(updatePhotoDosen), dosenAuthController.updatePhoto);
router.put('/profile/password', validate(changePasswordDosen), dosenAuthController.changePassword);

/**
 * @swagger
 * /dosen-portal/tahun-akademik:
 *   get:
 *     summary: Pilihan tahun akademik untuk Setting Tahun Akademik dosen (dikirim balik lewat header X-Tahun-Ajaran-Id)
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 */
router.get('/tahun-akademik', async (req, res, next) => {
  try {
    const data = await academicContextService.listTahunAkademik();
    res.json({ success: true, message: 'Tahun akademik fetched', data });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /dosen-portal/jadwal:
 *   get:
 *     summary: List jadwal kuliah yang diampu dosen yang sedang login (sebagai kordinator atau pengampu)
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List jadwal kuliah
 */
router.get('/jadwal', dosenPortalController.listJadwal);
// KRS mahasiswa bimbingan akademik: dosen PA menyetujui / menolak KRS yang diajukan.
router.get('/krs-bimbingan', dosenPortalController.listKrsBimbingan);
router.post('/krs-bimbingan/setujui-massal', validate(setujuiMassal), dosenPortalController.setujuiMassalKrs);
router.post('/krs-bimbingan/:id/setujui', dosenPortalController.setujuiKrs);
router.post('/krs-bimbingan/:id/tolak', dosenPortalController.tolakKrs);
// Ringkasan kelas (kepala halaman Realisasi Mengajar).
router.get('/jadwal/:id/ringkasan', dosenPortalController.ringkasanKelas);

/**
 * @swagger
 * /dosen-portal/realisasi:
 *   get:
 *     summary: List realisasi mengajar (kehadiran dosen) milik dosen yang sedang login
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List realisasi mengajar
 *   post:
 *     summary: Tambah realisasi mengajar baru
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Realisasi mengajar berhasil disimpan
 */
router.get('/realisasi', dosenPortalController.listRealisasi);
router.post('/realisasi', validate(createRealisasiMengajar), dosenPortalController.createRealisasi);

/**
 * @swagger
 * /dosen-portal/realisasi/aktif:
 *   get:
 *     summary: Kelas yang sedang berjalan (sudah dimulai, belum diselesaikan) milik dosen yang login; null bila tidak ada
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Realisasi aktif atau null
 * /dosen-portal/realisasi/start:
 *   post:
 *     summary: Mulai kelas — tanggal & jam masuk dari jam server; pertemuan otomatis bila tidak diisi
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Kelas dimulai
 *       400:
 *         description: Masih ada kelas lain yang berjalan
 * /dosen-portal/realisasi/{id}/stop:
 *   post:
 *     summary: Selesaikan kelas — jam keluar dari jam server (opsional sekalian menyimpan uraian)
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Kelas selesai
 * /dosen-portal/realisasi/{id}:
 *   put:
 *     summary: Ubah realisasi mengajar (termasuk uraian materi)
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Realisasi diperbarui
 */
router.get('/realisasi/aktif', dosenPortalController.kelasAktif);
router.post('/realisasi/start', validate(startKelas), dosenPortalController.startKelas);
router.post('/realisasi/:id/stop', validate(stopKelas), dosenPortalController.stopKelas);
router.put('/realisasi/:id', validate(updateRealisasiMengajar), dosenPortalController.updateRealisasi);

/**
 * @swagger
 * /dosen-portal/realisasi/{id}:
 *   delete:
 *     summary: Hapus (soft delete) realisasi mengajar milik dosen yang sedang login
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Realisasi mengajar berhasil dihapus
 *       404:
 *         description: Realisasi mengajar not found
 */
router.delete('/realisasi/:id', dosenPortalController.removeRealisasi);

/**
 * @swagger
 * /dosen-portal/realisasi/{id}/presensi:
 *   get:
 *     summary: Get roster mahasiswa (KRS disetujui) + presensi yang sudah diisi untuk satu realisasi mengajar
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Roster & presensi mahasiswa
 *       404:
 *         description: Realisasi mengajar not found
 *   put:
 *     summary: Simpan (upsert) presensi mahasiswa untuk satu realisasi mengajar
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Presensi mahasiswa berhasil disimpan
 *       400:
 *         description: Ada mahasiswaId yang tidak terdaftar (KRS disetujui) pada kelas ini
 *       404:
 *         description: Realisasi mengajar not found
 */
router.get('/realisasi/:id/presensi', dosenPortalController.getPresensi);
router.put('/realisasi/:id/presensi', validate(savePresensiMahasiswa), dosenPortalController.savePresensi);

/**
 * @swagger
 * /dosen-portal/rekap-mahasiswa:
 *   get:
 *     summary: List mahasiswa yang mengambil KRS pada satu jadwal kuliah milik dosen yang sedang login
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List mahasiswa
 */
router.get('/rekap-mahasiswa', dosenPortalController.listRekapMahasiswa);

/**
 * @swagger
 * /dosen-portal/kelas/{id}/realisasi:
 *   get:
 *     summary: Realisasi mengajar satu kelas yang diampu (pertemuan, jam, materi, jumlah mahasiswa hadir); /pdf untuk cetak
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 * /dosen-portal/kelas/{id}/rekap-kehadiran:
 *   get:
 *     summary: Rekap kehadiran mahasiswa per pertemuan (H/I/S/A, persentase); /pdf untuk cetak
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 * /dosen-portal/kelas/{id}/nilai:
 *   get:
 *     summary: Nilai mahasiswa satu kelas (komponen + nilai akhir); PUT untuk menyimpan, /pdf untuk cetak daftar nilai
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 */
/**
 * @swagger
 * /dosen-portal/rekap-realisasi:
 *   get:
 *     summary: Rekap realisasi mengajar per kelas yang diampu dosen login (jumlah hadir/izin/sakit/tidak hadir)
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 */
router.get('/rekap-realisasi', dosenRekapRealisasiController.list);

/**
 * @swagger
 * /dosen-portal/referensi-judul:
 *   get:
 *     summary: Referensi judul TA/Skripsi dari BAAK (lihat saja; filter jurusanId, tahunAjaranId, search)
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 * /dosen-portal/referensi-judul/filter:
 *   get:
 *     summary: Pilihan prodi & periode yang punya referensi judul
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 */
router.get('/referensi-judul/filter', referensiJudulController.filterDosen);
router.get('/referensi-judul', referensiJudulController.listDosen);

/**
 * @swagger
 * /dosen-portal/mahasiswa-pa:
 *   get:
 *     summary: Mahasiswa bimbingan akademik (PA) dosen login + IPK & KRS terakhir
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 * /dosen-portal/mahasiswa-pa/{id}/biodata:
 *   get:
 *     summary: Biodata ringkas mahasiswa bimbingan (tanpa data sensitif)
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 * /dosen-portal/mahasiswa-pa/{id}/krs:
 *   get:
 *     summary: Mata kuliah KRS terakhir mahasiswa bimbingan
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 * /dosen-portal/mahasiswa-pa/{id}/khs-pdf:
 *   get:
 *     summary: Cetak KHS seluruh semester mahasiswa bimbingan
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 */
router.get('/mahasiswa-pa', dosenMahasiswaPaController.list);
router.get('/mahasiswa-pa/:id/biodata', dosenMahasiswaPaController.biodata);
router.get('/mahasiswa-pa/:id/krs', dosenMahasiswaPaController.krs);
router.get('/mahasiswa-pa/:id/khs-pdf', dosenMahasiswaPaController.khsPdf);

/**
 * @swagger
 * /dosen-portal/kesediaan-mengajar:
 *   get:
 *     summary: Kesediaan mengajar dosen pada tahun akademik terpilih (header X-Tahun-Ajaran-Id, default tahun aktif) + pilihan matakuliah
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *   post:
 *     summary: Tambah kesediaan mengajar (matakuliah + jam per hari "HH:MM-HH:MM")
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 * /dosen-portal/kesediaan-mengajar/{id}:
 *   put:
 *     summary: Ubah kesediaan mengajar
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *   delete:
 *     summary: Hapus kesediaan mengajar
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 */
/**
 * @swagger
 * /dosen-portal/jadwal-ujian:
 *   get:
 *     summary: Jadwal ujian kelas yang diampu dosen (query jenisUjian UTS/UAS; tahun akademik dari header X-Tahun-Ajaran-Id, default aktif)
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 * /dosen-portal/jadwal-ujian/{jadwalKuliahId}:
 *   put:
 *     summary: Isi status, sifat & tanggal ujian kelas yang diampu
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 */
router.get(
  '/jadwal-ujian',
  catchAsync(async (req, res) => {
    const query = { ...req.query, tahunAjaranId: req.tahunAjaranId ?? undefined };
    const { data, meta, jenisUjian, tahunAjaran } = await jadwalUjianService.listJadwalUjian(query, await jadwalUjianService.jadwalIdsDosen(req.dosen.id));
    sendResponse(res, 200, {
      message: 'Jadwal ujian fetched',
      data: { items: data, jenisUjian, tahunAjaran, sifatOptions: jadwalUjianService.SIFAT_UJIAN },
      meta,
    });
  })
);
router.put(
  '/jadwal-ujian/:jadwalKuliahId',
  validate(simpanJadwalUjian),
  catchAsync(async (req, res) => {
    const ids = await jadwalUjianService.jadwalIdsDosen(req.dosen.id);
    await jadwalUjianService.simpanJadwalUjian(Number(req.params.jadwalKuliahId), req.body, ids, { dosenId: req.dosen.id });
    sendResponse(res, 200, { message: 'Jadwal ujian disimpan' });
  })
);

router.get('/kesediaan-mengajar', kesediaanMengajarController.get);
router.post('/kesediaan-mengajar', validate(saveKesediaan), kesediaanMengajarController.create);
router.put('/kesediaan-mengajar/:id', validate(saveKesediaan), kesediaanMengajarController.update);
router.delete('/kesediaan-mengajar/:id', kesediaanMengajarController.remove);
router.get('/kelas/:id/realisasi', dosenKelasController.realisasi);
router.get('/kelas/:id/realisasi/pdf', dosenKelasController.realisasiPdf);
router.get('/kelas/:id/rekap-kehadiran', dosenKelasController.rekapKehadiran);
router.get('/kelas/:id/rekap-kehadiran/pdf', dosenKelasController.rekapKehadiranPdf);
/**
 * @swagger
 * /dosen-portal/kelas/{id}/dosen-pengajar:
 *   get:
 *     summary: Detail kelas + tim dosen pengajar (penanggung jawab, SKS, jadwal, isi kuesioner)
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 */
router.get('/kelas/:id/dosen-pengajar', dosenKelasController.dosenPengajar);
router.get('/kelas/:id/nilai', dosenKelasController.nilai);
router.put('/kelas/:id/nilai', validate(saveNilaiKelas), dosenKelasController.simpanNilai);
/**
 * @swagger
 * /dosen-portal/kelas/{id}/nilai-obe:
 *   get:
 *     summary: Input nilai kelas OBE — kolom per komponen Komposisi Nilai Kelas (metode / sub metode) + nilai mahasiswa
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *   put:
 *     summary: Simpan nilai per komponen OBE; ringkasan per jenis, nilai akhir & huruf ditulis ke nilai mahasiswa
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 * /dosen-portal/kelas/{id}/komposisi-dari-rps:
 *   post:
 *     summary: Isi Komposisi Nilai Kelas dari Rencana Evaluasi RPS (bila belum diisi)
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 */
/**
 * @swagger
 * /dosen-portal/kelas/{id}/detail:
 *   get:
 *     summary: Detail kelas yang diampu (sama dengan Prodi → Kelas Kuliah → Detail) — info, dosen, peserta, komposisi nilai
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 * /dosen-portal/kelas/{id}/jadwal-perkuliahan:
 *   get:
 *     summary: Jadwal Perkuliahan kelas yang diampu — rencana RPS vs realisasi mengajar & rekap presensi
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 */
router.get(
  '/kelas/:id/detail',
  catchAsync(async (req, res) => {
    const jadwal = await dosenKelasService.ensureKelasDosen(Number(req.params.id), req.dosen.id);
    sendResponse(res, 200, { message: 'Detail kelas fetched', data: await kelasKuliahService.detail(jadwal.id, null) });
  })
);
router.get(
  '/kelas/:id/jadwal-perkuliahan',
  catchAsync(async (req, res) => {
    const jadwal = await dosenKelasService.ensureKelasDosen(Number(req.params.id), req.dosen.id);
    sendResponse(res, 200, { message: 'Jadwal perkuliahan fetched', data: await kelasKuliahService.jadwalPerkuliahan(jadwal.id, null) });
  })
);
/**
 * @swagger
 * /dosen-portal/kelas/{id}/jadwal-ujian:
 *   get:
 *     summary: Jadwal Ujian kelas yang diampu (UTS & UAS); ubah lewat PUT /dosen-portal/jadwal-ujian/{jadwalKuliahId}
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 * /dosen-portal/kelas/{id}/presensi:
 *   get:
 *     summary: Presensi Kelas yang diampu — matriks peserta × pertemuan + rekap
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 * /dosen-portal/kelas/{id}/rekap-kuesioner:
 *   get:
 *     summary: Rekap Kuesioner (EDOM) dosen yang login pada kelas yang diampu
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 */
const kelasDiampu = async (req) => (await dosenKelasService.ensureKelasDosen(Number(req.params.id), req.dosen.id)).id;
router.get(
  '/kelas/:id/jadwal-ujian',
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Jadwal ujian kelas fetched', data: await kelasKuliahMenuService.jadwalUjianKelas(await kelasDiampu(req)) }))
);
router.get(
  '/kelas/:id/presensi',
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Presensi kelas fetched', data: await kelasKuliahMenuService.presensiKelas(await kelasDiampu(req)) }))
);
router.get(
  '/kelas/:id/rekap-kuesioner',
  catchAsync(async (req, res) =>
    sendResponse(res, 200, {
      message: 'Rekap kuesioner fetched',
      data: await kelasKuliahMenuService.rekapKuesioner(await kelasDiampu(req), { dosenId: req.dosen.id }),
    })
  )
);
router.get(
  '/kelas/:id/nilai-obe',
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Nilai OBE kelas fetched', data: await nilaiObeService.getNilaiObe(req.dosen.id, Number(req.params.id)) }))
);
router.put(
  '/kelas/:id/nilai-obe',
  validate(saveNilaiObe),
  catchAsync(async (req, res) =>
    sendResponse(res, 200, { message: 'Nilai kelas disimpan', data: await nilaiObeService.saveNilaiObe(req.dosen.id, Number(req.params.id), req.body.items) })
  )
);
router.post(
  '/kelas/:id/komposisi-dari-rps',
  catchAsync(async (req, res) =>
    sendResponse(res, 200, { message: 'Komposisi nilai kelas diisi dari RPS', data: await nilaiObeService.komposisiDariRpsKelas(req.dosen.id, Number(req.params.id)) })
  )
);
/**
 * @swagger
 * /dosen-portal/kelas/{id}/bobot-obe:
 *   get:
 *     summary: Bobot OBE kelas (null = belum diisi)
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *   put:
 *     summary: Isi/ubah Bobot OBE kelas (total 100%); nilai yang sudah ada dihitung ulang
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 */
router.get('/kelas/:id/bobot-obe', dosenKelasController.bobotObe);
router.put('/kelas/:id/bobot-obe', validate(bobotObeSchema), dosenKelasController.simpanBobotObe);
router.get('/kelas/:id/nilai/pdf', dosenKelasController.nilaiPdf);

/**
 * @swagger
 * /dosen-portal/mata-kuliah:
 *   get:
 *     summary: List mata kuliah (+ silabus) yang diampu dosen yang sedang login
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List mata kuliah
 */
router.get('/mata-kuliah', dosenPortalController.listSilabus);

/**
 * @swagger
 * /dosen-portal/nilai-sidang:
 *   get:
 *     summary: List mahasiswa sidang yang dibimbing/diuji dosen yang sedang login, beserta nilai yang sudah diinput
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List nilai sidang per peran
 */
/**
 * @swagger
 * /dosen-portal/bimbingan-ta:
 *   get:
 *     summary: Mahasiswa bimbingan TA/Skripsi dosen yang login (pengajuan TA disetujui)
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 * /dosen-portal/bimbingan-ta/{pengajuanId}:
 *   get:
 *     summary: Kartu bimbingan satu mahasiswa
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *   post:
 *     summary: Tambah catatan konsultasi bimbingan
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 * /dosen-portal/bimbingan-ta/catatan/{id}:
 *   put:
 *     summary: Ubah catatan bimbingan milik dosen yang login
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *   delete:
 *     summary: Hapus catatan bimbingan milik dosen yang login
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 */
/**
 * @swagger
 * /dosen-portal/dashboard:
 *   get:
 *     summary: Dashboard dosen — pengumuman untuk dosen & biodata dosen pada SDM (+ riwayat pendidikan)
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 * /dosen-portal/biodata:
 *   put:
 *     summary: Ubah data pribadi & kontak dosen sendiri (telp, WhatsApp, email, alamat, ...)
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 * /dosen-portal/riwayat-pendidikan:
 *   post:
 *     summary: Tambah riwayat pendidikan
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 * /dosen-portal/riwayat-pendidikan/{id}:
 *   put:
 *     summary: Ubah riwayat pendidikan milik sendiri
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *   delete:
 *     summary: Hapus riwayat pendidikan milik sendiri
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 */
router.get('/dashboard', dosenDashboardController.dashboard);

/**
 * @swagger
 * /dosen-portal/pengumuman:
 *   get:
 *     summary: Pengumuman BAAK yang sedang tayang untuk dosen (semua prodi atau prodi dosen)
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 */
router.get(
  '/pengumuman',
  catchAsync(async (req, res) => {
    const dosen = await Dosen.unscoped().findByPk(req.dosen.id, { attributes: ['id', 'jurusanId'] });
    const data = await listPengumumanTayang('DOSEN', dosen?.jurusanId ?? null);
    sendResponse(res, 200, { message: 'Pengumuman fetched', data });
  })
);
router.put('/biodata', validate(updateBiodataDosen), dosenDashboardController.updateBiodata);
router.post('/riwayat-pendidikan', validate(riwayatPendidikan), dosenDashboardController.tambahRiwayat);
router.put('/riwayat-pendidikan/:id', validate(riwayatPendidikan), dosenDashboardController.ubahRiwayat);
router.delete('/riwayat-pendidikan/:id', dosenDashboardController.hapusRiwayat);

router.get('/bimbingan-ta/periode', bimbinganTaController.listPeriode);
router.get('/bimbingan-ta', bimbinganTaController.listMahasiswa);
router.put('/bimbingan-ta/catatan/:id', validate(catatanBimbingan), bimbinganTaController.ubah);
router.delete('/bimbingan-ta/catatan/:id', bimbinganTaController.hapus);
router.get('/bimbingan-ta/:pengajuanId', bimbinganTaController.kartuDosen);
router.post('/bimbingan-ta/:pengajuanId', validate(catatanBimbingan), bimbinganTaController.tambah);

router.get('/nilai-sidang', dosenPortalController.listNilaiSidang);

/**
 * @swagger
 * /dosen-portal/nilai-sidang/{pendaftarSidangId}:
 *   put:
 *     summary: Simpan nilai sidang (0-100) untuk peran dosen pada satu pendaftar sidang
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: pendaftarSidangId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               peran: { type: string, enum: [PEMBIMBING_1, PEMBIMBING_2, PENGUJI_1, PENGUJI_2] }
 *               nilai: { type: number, minimum: 0, maximum: 100 }
 *     responses:
 *       200:
 *         description: Nilai tersimpan
 *       403:
 *         description: Dosen tidak memiliki peran tersebut pada sidang ini
 */
router.put('/nilai-sidang/:pendaftarSidangId', validate(saveNilaiSidang), dosenPortalController.saveNilaiSidang);

/**
 * @swagger
 * /dosen-portal/koreksi-sidang/{pendaftarSidangId}:
 *   get:
 *     summary: List butir koreksi sidang milik dosen yang login untuk satu pendaftar & peran (?peran=)
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List butir koreksi
 *   post:
 *     summary: Tambah butir koreksi (peran, babHalaman, uraian)
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Butir koreksi ditambahkan
 * /dosen-portal/koreksi-sidang/{pendaftarSidangId}/pdf:
 *   get:
 *     summary: Cetak Lembar Koreksi Sidang Tugas Akhir (PDF) untuk peran dosen (?peran=)
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: File PDF
 * /dosen-portal/koreksi-sidang/item/{id}:
 *   put:
 *     summary: Ubah butir koreksi (babHalaman, uraian, isSelesai)
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Butir koreksi diperbarui
 *   delete:
 *     summary: Hapus butir koreksi
 *     tags: [DosenPortal]
 *     security: [{ dosenBearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Butir koreksi dihapus
 */
router.put('/koreksi-sidang/item/:id', validate(updateKoreksiSidang), dosenPortalController.updateKoreksiSidang);
router.delete('/koreksi-sidang/item/:id', dosenPortalController.removeKoreksiSidang);
router.get('/koreksi-sidang/:pendaftarSidangId/pdf', dosenPortalController.koreksiSidangPdf);
router.get('/koreksi-sidang/:pendaftarSidangId', dosenPortalController.listKoreksiSidang);
router.post('/koreksi-sidang/:pendaftarSidangId', validate(createKoreksiSidang), dosenPortalController.createKoreksiSidang);

module.exports = router;
