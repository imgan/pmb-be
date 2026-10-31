const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/realisasiDosen.service');

const list = catchAsync(async (req, res) => {
  const data = await service.listRealisasiDosen(req.query);
  sendResponse(res, 200, { message: 'Realisasi dosen fetched', data });
});

const detail = catchAsync(async (req, res) => {
  const data = await service.getRealisasiDetail(Number(req.params.id));
  sendResponse(res, 200, { message: 'Realisasi dosen detail fetched', data });
});

const filterOptions = catchAsync(async (req, res) => {
  const data = await service.getFilterOptions();
  sendResponse(res, 200, { message: 'Realisasi dosen filter options fetched', data });
});

module.exports = { list, detail, filterOptions };
