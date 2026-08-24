const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const { sendWorkbook } = require('../utils/excel');
const pembimbingTaSkripsiService = require('../services/pembimbingTaSkripsi.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await pembimbingTaSkripsiService.listPembimbingTaSkripsi(req.query);
  sendResponse(res, 200, { message: 'Pembimbing TA/Skripsi fetched', data, meta });
});

const filterOptions = catchAsync(async (req, res) => {
  const data = await pembimbingTaSkripsiService.getFilterOptions();
  sendResponse(res, 200, { message: 'Filter options fetched', data });
});

const exportExcel = catchAsync(async (req, res) => {
  const workbook = await pembimbingTaSkripsiService.exportPembimbingTaSkripsi();
  await sendWorkbook(res, workbook, 'pembimbing-ta-skripsi.xlsx');
});

const detail = catchAsync(async (req, res) => {
  const data = await pembimbingTaSkripsiService.getPembimbingTaSkripsiById(req.params.id);
  sendResponse(res, 200, { message: 'Pembimbing TA/Skripsi fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await pembimbingTaSkripsiService.createPembimbingTaSkripsi(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Pembimbing TA/Skripsi created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await pembimbingTaSkripsiService.updatePembimbingTaSkripsi(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Pembimbing TA/Skripsi updated', data });
});

const remove = catchAsync(async (req, res) => {
  await pembimbingTaSkripsiService.deletePembimbingTaSkripsi(req.params.id);
  sendResponse(res, 200, { message: 'Pembimbing TA/Skripsi deleted' });
});

module.exports = { list, filterOptions, exportExcel, detail, create, update, remove };
