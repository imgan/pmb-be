const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const laporanRealisasiService = require('../services/laporanRealisasi.service');
const laporanKehadiranMengajarService = require('../services/laporanKehadiranMengajar.service');
const { buildRealisasiMengajarPdf } = require('../services/laporanKehadiranMengajarPdf.service');
const { Kampus } = require('../models');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await laporanRealisasiService.listRealisasi(req.query);
  sendResponse(res, 200, { message: 'Data realisasi mengajar fetched', data, meta });
});

const kelasOptions = catchAsync(async (req, res) => {
  const data = await laporanRealisasiService.getKelasOptions();
  sendResponse(res, 200, { message: 'Kelas options fetched', data });
});

// Cetak realisasi satu jadwal: format "Realisasi Pembahasan Selama Perkuliahan" berisi data realisasi.
const cetakPdf = catchAsync(async (req, res) => {
  const [jadwal, realisasiRows, kampus] = await Promise.all([
    laporanKehadiranMengajarService.getJadwalWithContext(req.params.jadwalKuliahId),
    laporanKehadiranMengajarService.getRealisasiRows(req.params.jadwalKuliahId),
    Kampus.findOne(),
  ]);
  const ttd = await laporanKehadiranMengajarService.getPenandatangan(jadwal);
  const doc = buildRealisasiMengajarPdf(jadwal, realisasiRows, kampus?.namaKampus, ttd);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="realisasi-${jadwal.kelas}-${jadwal.kodeMataKuliah}.pdf"`);
  doc.pipe(res);
});

module.exports = { list, kelasOptions, cetakPdf };
