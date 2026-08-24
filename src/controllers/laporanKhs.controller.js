const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const laporanKhsService = require('../services/laporanKhs.service');
const { buildLaporanKhsPdf } = require('../services/laporanKhsPdf.service');
const kampusService = require('../services/kampus.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await laporanKhsService.searchMahasiswa(req.query);
  sendResponse(res, 200, { message: 'Data mahasiswa fetched', data, meta });
});

const cetakPdf = catchAsync(async (req, res) => {
  const { semester } = req.query;
  if (!semester) throw new ApiError(400, 'Semester wajib dipilih');

  const [data, kampus] = await Promise.all([
    laporanKhsService.getKhsData(req.params.mahasiswaId, semester),
    kampusService.getKampus(),
  ]);

  const doc = buildLaporanKhsPdf(data, kampus);
  const filename = `khs-${data.mahasiswa.nim}-semester-${semester}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  doc.pipe(res);
});

module.exports = { list, cetakPdf };
