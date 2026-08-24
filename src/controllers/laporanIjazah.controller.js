const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const laporanIjazahService = require('../services/laporanIjazah.service');
const { buildLaporanIjazahPdf, VALID_JENIS } = require('../services/laporanIjazahPdf.service');
const { Kampus } = require('../models');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await laporanIjazahService.listGraduates(req.query);
  sendResponse(res, 200, { message: 'Data lulusan fetched', data, meta });
});

const tahunLulusOptions = catchAsync(async (req, res) => {
  const data = await laporanIjazahService.getTahunLulusOptions();
  sendResponse(res, 200, { message: 'Tahun lulus options fetched', data });
});

const cetakData = catchAsync(async (req, res) => {
  const data = await laporanIjazahService.getCetakData(req.params.mahasiswaId);
  sendResponse(res, 200, { message: 'Data cetak fetched', data });
});

const cetakPdf = catchAsync(async (req, res) => {
  const { jenis } = req.params;
  if (!VALID_JENIS.includes(jenis)) {
    throw new ApiError(400, `Jenis dokumen tidak dikenal: ${jenis}`);
  }

  const [data, kampus] = await Promise.all([
    laporanIjazahService.getCetakData(req.params.mahasiswaId),
    Kampus.findOne(),
  ]);

  const doc = buildLaporanIjazahPdf(jenis, data, kampus?.namaKampus);
  const filename = `${jenis}-${data.mahasiswa.nim}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  doc.pipe(res);
});

module.exports = { list, tahunLulusOptions, cetakData, cetakPdf };
