const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const { sendWorkbook } = require('../utils/excel');
const tarifPembimbingService = require('../services/tarifPembimbing.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await tarifPembimbingService.listTarifPembimbing(req.query);
  sendResponse(res, 200, { message: 'Tarif Pembimbing fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await tarifPembimbingService.getTarifPembimbingById(req.params.id);
  sendResponse(res, 200, { message: 'Tarif Pembimbing fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await tarifPembimbingService.createTarifPembimbing(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Tarif Pembimbing created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await tarifPembimbingService.updateTarifPembimbing(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Tarif Pembimbing updated', data });
});

const remove = catchAsync(async (req, res) => {
  await tarifPembimbingService.deleteTarifPembimbing(req.params.id);
  sendResponse(res, 200, { message: 'Tarif Pembimbing deleted' });
});

const exportExcel = catchAsync(async (req, res) => {
  const workbook = await tarifPembimbingService.exportTarifPembimbing();
  await sendWorkbook(res, workbook, 'tarif-pembimbing.xlsx');
});

const importExcel = catchAsync(async (req, res) => {
  const result = await tarifPembimbingService.importTarifPembimbing(req.body.file, req.user.id);
  sendResponse(res, 200, { message: 'Import tarif pembimbing selesai', data: result });
});

const importTemplate = catchAsync(async (req, res) => {
  const workbook = tarifPembimbingService.exportTarifPembimbingTemplate();
  await sendWorkbook(res, workbook, 'template-import-tarif-pembimbing.xlsx');
});

module.exports = { list, detail, create, update, remove, exportExcel, importExcel, importTemplate };
