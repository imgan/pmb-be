const catchAsync = require('../utils/catchAsync');
const laporanKehadiranMengajarService = require('../services/laporanKehadiranMengajar.service');
const {
  buildTemplateKehadiranPdf,
  buildRealisasiMengajarPdf,
} = require('../services/laporanKehadiranMengajarPdf.service');
const { Kampus } = require('../models');

const cetakTemplateKehadiran = catchAsync(async (req, res) => {
  const [jadwal, daftarHadir, kampus] = await Promise.all([
    laporanKehadiranMengajarService.getJadwalWithContext(req.params.jadwalKuliahId),
    laporanKehadiranMengajarService.getDaftarHadir(req.params.jadwalKuliahId),
    Kampus.findOne(),
  ]);

  const ttd = await laporanKehadiranMengajarService.getPenandatangan(jadwal);
  const doc = buildTemplateKehadiranPdf(jadwal, daftarHadir, kampus?.namaKampus, ttd);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="template-kehadiran-${jadwal.kelas}-${jadwal.kodeMataKuliah}.pdf"`);
  doc.pipe(res);
});

// Template realisasi: pertemuan yang sudah direalisasikan langsung terisi, sisa baris (s.d. 16
// pertemuan) tetap kosong untuk diisi tangan.
const cetakTemplateRealisasi = catchAsync(async (req, res) => {
  const [jadwal, realisasiRows] = await Promise.all([
    laporanKehadiranMengajarService.getJadwalWithContext(req.params.jadwalKuliahId),
    laporanKehadiranMengajarService.getRealisasiRows(req.params.jadwalKuliahId),
  ]);

  const doc = buildRealisasiMengajarPdf(jadwal, realisasiRows);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="template-realisasi-${jadwal.kelas}-${jadwal.kodeMataKuliah}.pdf"`);
  doc.pipe(res);
});

module.exports = { cetakTemplateKehadiran, cetakTemplateRealisasi };
