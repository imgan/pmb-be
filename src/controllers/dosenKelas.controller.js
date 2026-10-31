const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/dosenKelas.service');
const kampusService = require('../services/kampus.service');
const { buildRekapKehadiranPdf, buildDaftarNilaiPdf } = require('../services/dosenKelasPdf.service');
const laporanKehadiranMengajarService = require('../services/laporanKehadiranMengajar.service');
const { buildRealisasiMengajarPdf: buildRealisasiBaakPdf } = require('../services/laporanKehadiranMengajarPdf.service');

const sendPdf = (res, doc, filename) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  doc.pipe(res);
};
const slug = (k) => `${k.kelas}-${k.kodeMataKuliah}`.replace(/[^A-Za-z0-9-]+/g, '-');

const realisasi = catchAsync(async (req, res) => {
  const data = await service.getRealisasiKelas(req.dosen.id, Number(req.params.id));
  sendResponse(res, 200, { message: 'Realisasi mengajar kelas fetched', data });
});

// Cetak realisasi dosen = cetakan BAAK (Laporan → Cetak Realisasi): data & builder yang sama persis,
// hanya ditambah cek bahwa dosen yang login mengampu kelas ini.
const realisasiPdf = catchAsync(async (req, res) => {
  const jadwalKuliahId = Number(req.params.id);
  await service.ensureKelasDosen(jadwalKuliahId, req.dosen.id);
  const [jadwal, realisasiRows] = await Promise.all([
    laporanKehadiranMengajarService.getJadwalWithContext(jadwalKuliahId),
    laporanKehadiranMengajarService.getRealisasiRows(jadwalKuliahId),
  ]);
  sendPdf(res, buildRealisasiBaakPdf(jadwal, realisasiRows), `realisasi-${jadwal.kelas}-${jadwal.kodeMataKuliah}.pdf`);
});

const rekapKehadiran = catchAsync(async (req, res) => {
  const data = await service.getRekapKehadiranKelas(req.dosen.id, Number(req.params.id));
  sendResponse(res, 200, { message: 'Rekap kehadiran kelas fetched', data });
});

const rekapKehadiranPdf = catchAsync(async (req, res) => {
  const [data, kampus] = await Promise.all([service.getRekapKehadiranKelas(req.dosen.id, Number(req.params.id)), kampusService.getKampus()]);
  sendPdf(res, buildRekapKehadiranPdf(data, kampus), `rekap-kehadiran-${slug(data.kelas)}.pdf`);
});

const nilai = catchAsync(async (req, res) => {
  const data = await service.getNilaiKelas(req.dosen.id, Number(req.params.id));
  sendResponse(res, 200, { message: 'Nilai kelas fetched', data });
});

const simpanNilai = catchAsync(async (req, res) => {
  const data = await service.saveNilaiKelas(req.dosen.id, Number(req.params.id), req.body.items);
  sendResponse(res, 200, { message: 'Nilai kelas disimpan', data });
});

const nilaiPdf = catchAsync(async (req, res) => {
  const [data, kampus] = await Promise.all([service.getNilaiKelas(req.dosen.id, Number(req.params.id)), kampusService.getKampus()]);
  sendPdf(res, buildDaftarNilaiPdf(data, kampus), `daftar-nilai-${slug(data.kelas)}.pdf`);
});

const bobotObe = catchAsync(async (req, res) => {
  const data = await service.getBobotObeKelas(req.dosen.id, Number(req.params.id));
  sendResponse(res, 200, { message: 'Bobot OBE fetched', data });
});

const simpanBobotObe = catchAsync(async (req, res) => {
  const data = await service.saveBobotObeKelas(req.dosen.id, Number(req.params.id), req.body);
  sendResponse(res, 200, {
    message: data.nilaiDihitungUlang ? `Bobot OBE disimpan, ${data.nilaiDihitungUlang} nilai dihitung ulang` : 'Bobot OBE disimpan',
    data,
  });
});

const dosenPengajar = catchAsync(async (req, res) => {
  const data = await service.getDosenPengajarKelas(req.dosen.id, Number(req.params.id));
  sendResponse(res, 200, { message: 'Dosen pengajar kelas fetched', data });
});

module.exports = {
  dosenPengajar,
  bobotObe,
  simpanBobotObe, realisasi, realisasiPdf, rekapKehadiran, rekapKehadiranPdf, nilai, simpanNilai, nilaiPdf };
