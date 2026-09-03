const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const { sendWorkbook } = require('../utils/excel');
const tarifLainService = require('../services/tarifLain.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await tarifLainService.listTarifLain(req.query);
  sendResponse(res, 200, { message: 'Tarif lain fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await tarifLainService.getTarifLainById(req.params.id);
  sendResponse(res, 200, { message: 'Tarif lain fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await tarifLainService.createTarifLain(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Tarif lain created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await tarifLainService.updateTarifLain(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Tarif lain updated', data });
});

const remove = catchAsync(async (req, res) => {
  await tarifLainService.deleteTarifLain(req.params.id);
  sendResponse(res, 200, { message: 'Tarif lain deleted' });
});

const exportExcel = catchAsync(async (req, res) => {
  const workbook = await tarifLainService.exportTarifLain();
  await sendWorkbook(res, workbook, 'tarif-lain.xlsx');
});

const importExcel = catchAsync(async (req, res) => {
  const result = await tarifLainService.importTarifLain(req.body.file, req.user.id);
  sendResponse(res, 200, { message: 'Import tarif lain selesai', data: result });
});

const importTemplate = catchAsync(async (req, res) => {
  const workbook = tarifLainService.exportTarifLainTemplate();
  await sendWorkbook(res, workbook, 'template-import-tarif-lain.xlsx');
});

module.exports = { list, detail, create, update, remove, exportExcel, importExcel, importTemplate };
