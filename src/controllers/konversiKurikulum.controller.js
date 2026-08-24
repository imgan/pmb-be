const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const konversiKurikulumService = require('../services/konversiKurikulum.service');

const filterOptions = catchAsync(async (req, res) => {
  const data = await konversiKurikulumService.getFilterOptions();
  sendResponse(res, 200, { message: 'Filter options fetched', data });
});

const list = catchAsync(async (req, res) => {
  const data = await konversiKurikulumService.listKonversi(req.query);
  sendResponse(res, 200, { message: 'Konversi kurikulum fetched', data });
});

const save = catchAsync(async (req, res) => {
  const data = await konversiKurikulumService.saveKonversi(req.body, req.user.id);
  sendResponse(res, 200, { message: 'Konversi kurikulum berhasil disimpan', data });
});

module.exports = { filterOptions, list, save };
