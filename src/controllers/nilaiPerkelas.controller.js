const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const nilaiPerkelasService = require('../services/nilaiPerkelas.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await nilaiPerkelasService.listNilaiPerkelas(req.query);
  sendResponse(res, 200, { message: 'Nilai perkelas fetched', data, meta });
});

const kelasOptions = catchAsync(async (req, res) => {
  const data = await nilaiPerkelasService.getKelasOptions();
  sendResponse(res, 200, { message: 'Kelas options fetched', data });
});

const detail = catchAsync(async (req, res) => {
  const data = await nilaiPerkelasService.getNilaiPerkelasDetail(req.params.jadwalKuliahId);
  sendResponse(res, 200, { message: 'Nilai perkelas detail fetched', data });
});

module.exports = { list, kelasOptions, detail };
