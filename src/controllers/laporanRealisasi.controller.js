const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const laporanRealisasiService = require('../services/laporanRealisasi.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await laporanRealisasiService.listRealisasi(req.query);
  sendResponse(res, 200, { message: 'Data realisasi mengajar fetched', data, meta });
});

const kelasOptions = catchAsync(async (req, res) => {
  const data = await laporanRealisasiService.getKelasOptions();
  sendResponse(res, 200, { message: 'Kelas options fetched', data });
});

module.exports = { list, kelasOptions };
