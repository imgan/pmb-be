const catchAsync = require('../utils/catchAsync');
const laporanKehadiranMengajarService = require('../services/laporanKehadiranMengajar.service');
const {
  buildTemplateKehadiranPdf,
  buildTemplateRealisasiPdf,
} = require('../services/laporanKehadiranMengajarPdf.service');
const { Kampus } = require('../models');

const cetakTemplateKehadiran = catchAsync(async (req, res) => {
  const [jadwal, kampus] = await Promise.all([
    laporanKehadiranMengajarService.getJadwalWithContext(req.params.jadwalKuliahId),
    Kampus.findOne(),
  ]);

  const doc = buildTemplateKehadiranPdf(jadwal, kampus?.namaKampus);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="template-kehadiran-${jadwal.kelas}-${jadwal.kodeMataKuliah}.pdf"`);
  doc.pipe(res);
});

const cetakTemplateRealisasi = catchAsync(async (req, res) => {
  const [jadwal, realisasiRows, kampus] = await Promise.all([
    laporanKehadiranMengajarService.getJadwalWithContext(req.params.jadwalKuliahId),
    laporanKehadiranMengajarService.getRealisasiRows(req.params.jadwalKuliahId),
    Kampus.findOne(),
  ]);

  const doc = buildTemplateRealisasiPdf(jadwal, realisasiRows, kampus?.namaKampus);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="template-realisasi-${jadwal.kelas}-${jadwal.kodeMataKuliah}.pdf"`);
  doc.pipe(res);
});

module.exports = { cetakTemplateKehadiran, cetakTemplateRealisasi };
