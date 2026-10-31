const express = require('express');
const Joi = require('joi');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const validate = require('../middlewares/validate.middleware');
const authenticateDosen = require('../middlewares/dosenAuth.middleware');
const authenticateMahasiswa = require('../middlewares/mahasiswaAuth.middleware');
const service = require('../services/elearning.service');
const { sendWorkbook } = require('../utils/excel');

/**
 * @swagger
 * tags:
 *   name: Elearning
 *   description: E-learning per kelas — dosen membuat Materi / Video (link) / Kuis dan meng-assign ke mahasiswa kelasnya; mahasiswa melihat & mengerjakan kuis
 * /dosen-portal/elearning/kelas:
 *   get:
 *     summary: Kelas yang diampu dosen (TA terpilih) + jumlah peserta & konten
 *     tags: [Elearning]
 *     security: [{ bearerAuth: [] }]
 * /dosen-portal/elearning/kelas/{jadwalKuliahId}:
 *   get:
 *     summary: Info kelas, peserta, daftar konten + statistik
 *     tags: [Elearning]
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     summary: Tambah konten (jenis MATERI | VIDEO | KUIS; target SEMUA | PILIHAN + penerima; soal untuk kuis)
 *     tags: [Elearning]
 *     security: [{ bearerAuth: [] }]
 * /dosen-portal/elearning/konten/{id}:
 *   get:
 *     summary: Detail konten (form ubah) termasuk soal & kunci jawaban
 *     tags: [Elearning]
 *     security: [{ bearerAuth: [] }]
 *   put:
 *     summary: Ubah konten
 *     tags: [Elearning]
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     summary: Hapus konten (soal, penerima & jawaban ikut terhapus)
 *     tags: [Elearning]
 *     security: [{ bearerAuth: [] }]
 * /dosen-portal/elearning/kelas/{jadwalKuliahId}/laporan:
 *   get:
 *     summary: Laporan kelas — skor kuis per mahasiswa & jumlah mahasiswa yang melihat video / materi
 *     tags: [Elearning]
 *     security: [{ bearerAuth: [] }]
 * /dosen-portal/elearning/ringkasan:
 *   get:
 *     summary: Popup setelah login dosen — jadwal kelas minggu ini (hari, jam ke-, ruangan) & kuis yang belum dikerjakan semua mahasiswa
 *     tags: [Elearning]
 *     security: [{ bearerAuth: [] }]
 * /dosen-portal/elearning/konten:
 *   get:
 *     summary: Semua konten di kelas yang diampu (TA terpilih), dikelompokkan per kelas — tampilan katalog
 *     tags: [Elearning]
 *     security: [{ bearerAuth: [] }]
 * /dosen-portal/elearning/template-soal:
 *   get:
 *     summary: Unduh template Excel soal kuis (Pertanyaan, Pilihan A–F, Jawaban Benar)
 *     tags: [Elearning]
 *     security: [{ bearerAuth: [] }]
 * /dosen-portal/elearning/import-soal:
 *   post:
 *     summary: Baca soal kuis dari Excel (body file base64) — tidak menyimpan, hasil dimuat ke form kuis
 *     tags: [Elearning]
 *     security: [{ bearerAuth: [] }]
 * /dosen-portal/elearning/konten/{id}/suka:
 *   post:
 *     summary: Suka / batal suka konten (timeline)
 *     tags: [Elearning]
 *     security: [{ bearerAuth: [] }]
 * /dosen-portal/elearning/konten/{id}/komentar:
 *   get:
 *     summary: Komentar konten
 *     tags: [Elearning]
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     summary: Tambah komentar
 *     tags: [Elearning]
 *     security: [{ bearerAuth: [] }]
 * /dosen-portal/elearning/komentar/{id}:
 *   delete:
 *     summary: Hapus komentar (dosen pengajar kelas)
 *     tags: [Elearning]
 *     security: [{ bearerAuth: [] }]
 * /dosen-portal/elearning/konten/{id}/hasil:
 *   get:
 *     summary: Hasil kuis per penerima
 *     tags: [Elearning]
 *     security: [{ bearerAuth: [] }]
 * /mahasiswa-portal/elearning:
 *   get:
 *     summary: Konten e-learning yang ditujukan ke mahasiswa login
 *     tags: [Elearning]
 *     security: [{ bearerAuth: [] }]
 * /mahasiswa-portal/elearning/{id}:
 *   get:
 *     summary: Detail konten (soal kuis tanpa kunci sebelum dikerjakan)
 *     tags: [Elearning]
 *     security: [{ bearerAuth: [] }]
 * /mahasiswa-portal/elearning/{id}/selesai:
 *   post:
 *     summary: Tandai materi / video sudah dipelajari / ditonton (membuka konten yang mensyaratkannya)
 *     tags: [Elearning]
 *     security: [{ bearerAuth: [] }]
 * /mahasiswa-portal/elearning/{id}/draf:
 *   put:
 *     summary: Simpan draf pengerjaan kuis (jawaban sementara, bisa dilanjutkan; dihapus saat jawaban dikirim)
 *     tags: [Elearning]
 *     security: [{ bearerAuth: [] }]
 * /mahasiswa-portal/elearning/{id}/tugas:
 *   post:
 *     summary: Kumpulkan / perbarui jawaban tugas (isi teks, lampiran data URL) — ditandai terlambat bila lewat tenggat
 *     tags: [Elearning]
 *     security: [{ bearerAuth: [] }]
 * /dosen-portal/elearning/konten/{id}/pengumpulan:
 *   get:
 *     summary: Daftar pengumpulan tugas (status, terlambat, nilai, catatan)
 *     tags: [Elearning]
 *     security: [{ bearerAuth: [] }]
 * /dosen-portal/elearning/pengumpulan/{id}/lampiran:
 *   get:
 *     summary: File jawaban tugas mahasiswa
 *     tags: [Elearning]
 *     security: [{ bearerAuth: [] }]
 * /dosen-portal/elearning/pengumpulan/{id}/nilai:
 *   put:
 *     summary: Beri nilai (0–100) & catatan jawaban tugas
 *     tags: [Elearning]
 *     security: [{ bearerAuth: [] }]
 * /mahasiswa-portal/elearning/{id}/jawaban:
 *   post:
 *     summary: Kirim jawaban kuis (sekali) — skor otomatis
 *     tags: [Elearning]
 *     security: [{ bearerAuth: [] }]
 */
const teks = Joi.string().trim().allow('', null);
const kontenSchema = Joi.object({
  jenis: Joi.string().valid(...service.JENIS),
  judul: Joi.string().trim().max(200).required().messages({ 'any.required': 'Judul wajib diisi', 'string.empty': 'Judul wajib diisi' }),
  kategori: Joi.string().trim().max(50).allow('', null),
  // Tagline bisa lebih dari satu (maks. 5, masing-masing maks. 30 karakter); string tunggal tetap diterima.
  tagline: Joi.alternatives(Joi.array().items(Joi.string().trim().max(30).allow('')).max(5), Joi.string().trim().max(30).allow('', null)).allow(null),
  isWajib: Joi.boolean().default(false),
  // Konten yang harus diselesaikan dulu (kelas yang sama); null = tanpa prasyarat.
  prasyaratId: Joi.number().integer().allow(null, ''),
  deskripsi: teks,
  isi: teks,
  url: Joi.string().trim().max(500).uri({ allowRelative: false }).allow('', null).messages({ 'string.uri': 'Link harus berupa URL lengkap (http/https)' }),
  lampiran: Joi.string().allow('', null),
  lampiranNama: Joi.string().trim().max(255).allow('', null),
  // Materi: link video YouTube / Google Drive (bisa lebih dari satu).
  videoUrls: Joi.array().items(Joi.string().trim().max(500).allow('')).max(10).default([]),
  // Materi: jumlah gambar / dokumen yang akan diunggah setelah konten tersimpan (untuk cek materi tidak kosong).
  jumlahBerkasBaru: Joi.number().integer().min(0).default(0),
  pertemuanKe: Joi.number().integer().min(1).max(99).allow(null, ''),
  tenggat: Joi.date().iso().allow(null, ''),
  // Kuis: durasi pengerjaan (menit; kosong = tanpa batas), acak soal, tampilkan nilai ke mahasiswa.
  durasiMenit: Joi.number().integer().min(1).max(600).allow(null, ''),
  acakSoal: Joi.boolean().default(false),
  tampilkanHasil: Joi.boolean().default(true),
  // Periode tayang untuk mahasiswa (kosong = tanpa batas).
  tersediaMulai: Joi.date().iso().allow(null, ''),
  tersediaSampai: Joi.date().iso().allow(null, ''),
  // SEMUA = peserta kelas, PILIHAN = mahasiswa tertentu, KAMPUS = semua mahasiswa aktif kampus, GRUP = dibagi per grup.
  target: Joi.string().valid('SEMUA', 'PILIHAN', 'KAMPUS', 'GRUP').default('SEMUA'),
  penerima: Joi.array().items(Joi.number().integer()).default([]),
  grup: Joi.array()
    .items(Joi.object({ nama: Joi.string().trim().max(60).allow('', null), anggota: Joi.array().items(Joi.number().integer()).default([]) }))
    .max(100)
    .default([]),
  isPublished: Joi.boolean().default(true),
  soal: Joi.array()
    .items(
      Joi.object({
        id: Joi.number().integer().allow(null),
        pertanyaan: Joi.string().trim().allow(''),
        pilihan: Joi.array().items(Joi.string().allow('')).min(2).max(6),
        jawabanBenar: Joi.number().integer().min(0).allow(null),
      })
    )
    .default([]),
});
const id = (req, key = 'id') => Number(req.params[key]);

// ---- Dosen ----
const dosen = express.Router();
dosen.use(authenticateDosen);
dosen.get('/template-soal', catchAsync(async (req, res) => sendWorkbook(res, service.templateSoal(), 'template-soal-kuis.xlsx')));
dosen.post(
  '/import-soal',
  validate(Joi.object({ file: Joi.string().required().messages({ 'any.required': 'File wajib diunggah' }) })),
  catchAsync(async (req, res) => {
    const data = await service.importSoal(req.body.file);
    const dilewati = data.errors.length ? `, ${data.errors.length} baris dilewati` : '';
    sendResponse(res, 200, { message: `${data.soal.length} soal terbaca${dilewati}`, data });
  })
);
dosen.get(
  '/ringkasan',
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Ringkasan fetched', data: await service.ringkasanDosen(req.dosen.id, req.tahunAjaranId) }))
);
dosen.get(
  '/konten',
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Konten fetched', data: await service.listKontenDosen(req.dosen.id, req.tahunAjaranId) }))
);
// Sinkronisasi Input Nilai: rekap kehadiran + nilai kuis / tugas e-learning kelas.
dosen.get(
  '/kelas/:jadwalKuliahId/sumber-nilai',
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Sumber nilai fetched', data: await service.sumberNilaiKelas(req.dosen.id, id(req, 'jadwalKuliahId')) }))
);
// Laporan tugas kelas: ringkasan per tugas & unduh Excel (?kontenId = satu tugas saja).
dosen.get(
  '/kelas/:jadwalKuliahId/laporan-tugas',
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Laporan tugas fetched', data: await service.laporanTugasKelas(req.dosen.id, id(req, 'jadwalKuliahId')) }))
);
dosen.get(
  '/kelas/:jadwalKuliahId/laporan-tugas/export',
  catchAsync(async (req, res) => {
    const { workbook, filename } = await service.exportLaporanTugas(req.dosen.id, id(req, 'jadwalKuliahId'), Number(req.query.kontenId) || null);
    await sendWorkbook(res, workbook, filename);
  })
);
dosen.get('/kelas', catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Kelas fetched', data: await service.listKelasDosen(req.dosen.id, req.tahunAjaranId) })));
dosen.get(
  '/kelas/:jadwalKuliahId',
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Kelas fetched', data: await service.kelasDosen(req.dosen.id, id(req, 'jadwalKuliahId')) }))
);
dosen.get(
  '/kelas/:jadwalKuliahId/laporan',
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Laporan e-learning fetched', data: await service.laporanKelas(req.dosen.id, id(req, 'jadwalKuliahId')) }))
);
dosen.post(
  '/kelas/:jadwalKuliahId',
  validate(kontenSchema),
  catchAsync(async (req, res) =>
    sendResponse(res, 201, { message: 'Konten e-learning ditambahkan', data: await service.saveKonten(req.dosen.id, id(req, 'jadwalKuliahId'), req.body) })
  )
);
dosen.get('/konten/:id', catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Konten fetched', data: await service.getKontenDosen(req.dosen.id, id(req)) })));
dosen.put(
  '/konten/:id',
  validate(kontenSchema),
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Konten e-learning diperbarui', data: await service.saveKonten(req.dosen.id, null, req.body, id(req)) }))
);
dosen.delete(
  '/konten/:id',
  catchAsync(async (req, res) => {
    await service.deleteKonten(req.dosen.id, id(req));
    sendResponse(res, 200, { message: 'Konten e-learning dihapus' });
  })
);
// Materi: gambar & dokumen (diunggah satu per satu setelah materi tersimpan).
dosen.post(
  '/konten/:id/berkas',
  validate(
    Joi.object({
      jenis: Joi.string().valid('GAMBAR', 'DOKUMEN').required(),
      nama: Joi.string().trim().max(255).required(),
      data: Joi.string().required(),
    })
  ),
  catchAsync(async (req, res) => sendResponse(res, 201, { message: 'Berkas diunggah', data: await service.tambahBerkas(req.dosen.id, id(req), req.body) }))
);
dosen.get(
  '/konten/:id/berkas/:berkasId',
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Berkas fetched', data: await service.berkasDosen(req.dosen.id, id(req), id(req, 'berkasId')) }))
);
dosen.delete(
  '/konten/:id/berkas/:berkasId',
  catchAsync(async (req, res) => {
    await service.hapusBerkas(req.dosen.id, id(req), id(req, 'berkasId'));
    sendResponse(res, 200, { message: 'Berkas dihapus' });
  })
);
// Interaksi timeline: suka & komentar.
dosen.post('/konten/:id/suka', catchAsync(async (req, res) => sendResponse(res, 200, { message: 'OK', data: await service.toggleSukaDosen(req.dosen.id, id(req)) })));
dosen.get('/konten/:id/komentar', catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Komentar fetched', data: await service.listKomentarDosen(req.dosen.id, id(req)) })));
dosen.post(
  '/konten/:id/komentar',
  validate(Joi.object({ isi: Joi.string().trim().max(2000).required().messages({ 'any.required': 'Komentar tidak boleh kosong', 'string.empty': 'Komentar tidak boleh kosong' }) })),
  catchAsync(async (req, res) => sendResponse(res, 201, { message: 'Komentar ditambahkan', data: await service.tambahKomentarDosen(req.dosen.id, id(req), req.body.isi) }))
);
dosen.delete(
  '/komentar/:id',
  catchAsync(async (req, res) => {
    await service.hapusKomentarDosen(req.dosen.id, id(req));
    sendResponse(res, 200, { message: 'Komentar dihapus' });
  })
);
// Tugas: daftar pengumpulan, unduh file jawaban, beri nilai.
dosen.get('/konten/:id/pengumpulan', catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Pengumpulan fetched', data: await service.pengumpulanTugas(req.dosen.id, id(req)) })));
dosen.get('/pengumpulan/:id/lampiran', catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Lampiran fetched', data: await service.lampiranJawabanTugas(req.dosen.id, id(req)) })));
dosen.put(
  '/pengumpulan/:id/nilai',
  validate(Joi.object({ nilai: Joi.number().min(0).max(100).required().messages({ 'any.required': 'Nilai wajib diisi' }), catatan: Joi.string().trim().max(2000).allow('', null) })),
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Nilai disimpan', data: await service.nilaiTugas(req.dosen.id, id(req), req.body) }))
);
dosen.get('/konten/:id/hasil', catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Hasil kuis fetched', data: await service.hasilKuis(req.dosen.id, id(req)) })));
// Panic button: reset kuis satu mahasiswa (jawaban & draf dihapus) agar bisa mengerjakan ulang.
dosen.post(
  '/konten/:id/hasil/:mahasiswaId/reset',
  catchAsync(async (req, res) =>
    sendResponse(res, 200, { message: 'Kuis mahasiswa direset', data: await service.resetKuisMahasiswa(req.dosen.id, id(req), id(req, 'mahasiswaId')) })
  )
);

// ---- Mahasiswa ----
const mahasiswa = express.Router();
mahasiswa.use(authenticateMahasiswa);
mahasiswa.get('/', catchAsync(async (req, res) => sendResponse(res, 200, { message: 'E-learning fetched', data: await service.listKontenMahasiswa(req.mahasiswa.id) })));
// Learning History: konten kelas semester lampau (?semuaPeriode=1 = termasuk semester berjalan) — sebelum '/:id'.
mahasiswa.get(
  '/riwayat',
  catchAsync(async (req, res) =>
    sendResponse(res, 200, { message: 'Riwayat belajar fetched', data: await service.riwayatBelajar(req.mahasiswa.id, { semuaPeriode: req.query.semuaPeriode === '1' }) })
  )
);
// My Team: konten / tugas grup yang memuat mahasiswa ini — sebelum '/:id'.
mahasiswa.get('/tim', catchAsync(async (req, res) => sendResponse(res, 200, { message: 'My Team fetched', data: await service.timMahasiswa(req.mahasiswa.id) })));
// My Class (kelas KRS disetujui tahun ajaran aktif) — sebelum '/:id'.
mahasiswa.get('/kelas', catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Kelas fetched', data: await service.kelasMahasiswa(req.mahasiswa.id) })));
// Interaksi timeline: suka & komentar (mahasiswa hanya menghapus komentarnya sendiri).
mahasiswa.delete(
  '/komentar/:id',
  catchAsync(async (req, res) => {
    await service.hapusKomentarMahasiswa(req.mahasiswa.id, id(req));
    sendResponse(res, 200, { message: 'Komentar dihapus' });
  })
);
mahasiswa.post('/:id/suka', catchAsync(async (req, res) => sendResponse(res, 200, { message: 'OK', data: await service.toggleSukaMahasiswa(req.mahasiswa.id, id(req)) })));
mahasiswa.get('/:id/komentar', catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Komentar fetched', data: await service.listKomentarMahasiswa(req.mahasiswa.id, id(req)) })));
mahasiswa.post(
  '/:id/komentar',
  validate(Joi.object({ isi: Joi.string().trim().max(2000).required().messages({ 'any.required': 'Komentar wajib diisi', 'string.empty': 'Komentar wajib diisi' }) })),
  catchAsync(async (req, res) => sendResponse(res, 201, { message: 'Komentar ditambahkan', data: await service.tambahKomentarMahasiswa(req.mahasiswa.id, id(req), req.body.isi) }))
);
mahasiswa.get('/:id', catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Konten fetched', data: await service.getKontenMahasiswa(req.mahasiswa.id, id(req)) })));
// Isi gambar / dokumen materi.
mahasiswa.get(
  '/:id/berkas/:berkasId',
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Berkas fetched', data: await service.berkasMahasiswa(req.mahasiswa.id, id(req), id(req, 'berkasId')) }))
);
// Durasi aktif membuka konten (ping berkala dari halaman detail).
mahasiswa.post(
  '/:id/durasi',
  validate(Joi.object({ detik: Joi.number().integer().min(1).max(300).required() })),
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'OK', data: await service.tambahDurasi(req.mahasiswa.id, id(req), req.body.detik) }))
);
mahasiswa.post(
  '/:id/selesai',
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Ditandai selesai', data: await service.tandaiSelesai(req.mahasiswa.id, id(req)) }))
);
mahasiswa.put(
  '/:id/draf',
  validate(Joi.object({ jawaban: Joi.object().pattern(Joi.string(), Joi.number().integer().allow(null)).required() })),
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Draf tersimpan', data: await service.simpanDrafKuis(req.mahasiswa.id, id(req), req.body.jawaban) }))
);
mahasiswa.post(
  '/:id/tugas',
  validate(Joi.object({ isi: Joi.string().allow('', null), lampiran: Joi.string().allow('', null), lampiranNama: Joi.string().trim().max(255).allow('', null) })),
  catchAsync(async (req, res) => {
    const data = await service.kumpulkanTugas(req.mahasiswa.id, id(req), req.body);
    const pesan = data.terlambat ? 'Tugas dikumpulkan (terlambat)' : 'Tugas dikumpulkan';
    sendResponse(res, 200, { message: data.untukGrup ? `${pesan} untuk seluruh anggota grup` : pesan, data });
  })
);
mahasiswa.post(
  '/:id/jawaban',
  validate(Joi.object({ jawaban: Joi.object().pattern(Joi.string(), Joi.number().integer().allow(null)).required() })),
  catchAsync(async (req, res) => {
    const data = await service.kirimJawaban(req.mahasiswa.id, id(req), req.body.jawaban);
    sendResponse(res, 200, { message: data.tampilkanHasil ? `Jawaban terkirim — skor ${data.skor}` : 'Jawaban terkirim', data });
  })
);
// Kuis berdurasi: mulai mengerjakan (waktu mulai dicatat sekali).
mahasiswa.post(
  '/:id/mulai',
  catchAsync(async (req, res) => sendResponse(res, 200, { message: 'Kuis dimulai', data: await service.mulaiKuis(req.mahasiswa.id, id(req)) }))
);

module.exports = { dosen, mahasiswa };
