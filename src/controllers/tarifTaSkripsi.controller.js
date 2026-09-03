const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const { sendWorkbook } = require('../utils/excel');
const tarifTaSkripsiService = require('../services/tarifTaSkripsi.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await tarifTaSkripsiService.listTarifTaSkripsi(req.query);
  sendResponse(res, 200, { message: 'Tarif TA/Skripsi fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await tarifTaSkripsiService.getTarifTaSkripsiById(req.params.id);
  sendResponse(res, 200, { message: 'Tarif TA/Skripsi fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await tarifTaSkripsiService.createTarifTaSkripsi(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Tarif TA/Skripsi created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await tarifTaSkripsiService.updateTarifTaSkripsi(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Tarif TA/Skripsi updated', data });
});

const remove = catchAsync(async (req, res) => {
  await tarifTaSkripsiService.deleteTarifTaSkripsi(req.params.id);
  sendResponse(res, 200, { message: 'Tarif TA/Skripsi deleted' });
});

const exportExcel = catchAsync(async (req, res) => {
  const workbook = await tarifTaSkripsiService.exportTarifTaSkripsi();
  await sendWorkbook(res, workbook, 'tarif-ta-skripsi.xlsx');
});

const importExcel = catchAsync(async (req, res) => {
  const result = await tarifTaSkripsiService.importTarifTaSkripsi(req.body.file, req.user.id);
  sendResponse(res, 200, { message: 'Import tarif TA/Skripsi selesai', data: result });
});

const importTemplate = catchAsync(async (req, res) => {
  const workbook = tarifTaSkripsiService.exportTarifTaSkripsiTemplate();
  await sendWorkbook(res, workbook, 'template-import-tarif-ta-skripsi.xlsx');
});

module.exports = { list, detail, create, update, remove, exportExcel, importExcel, importTemplate };
