const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const { sendWorkbook } = require('../utils/excel');
const tarifKuliahService = require('../services/tarifKuliah.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await tarifKuliahService.listTarifKuliah(req.query);
  sendResponse(res, 200, { message: 'Tarif Kuliah fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await tarifKuliahService.getTarifKuliahById(req.params.id);
  sendResponse(res, 200, { message: 'Tarif Kuliah fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await tarifKuliahService.createTarifKuliah(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Tarif Kuliah created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await tarifKuliahService.updateTarifKuliah(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Tarif Kuliah updated', data });
});

const remove = catchAsync(async (req, res) => {
  await tarifKuliahService.deleteTarifKuliah(req.params.id);
  sendResponse(res, 200, { message: 'Tarif Kuliah deleted' });
});

const exportExcel = catchAsync(async (req, res) => {
  const workbook = await tarifKuliahService.exportTarifKuliah();
  await sendWorkbook(res, workbook, 'tarif-kuliah.xlsx');
});

const importExcel = catchAsync(async (req, res) => {
  const result = await tarifKuliahService.importTarifKuliah(req.body.file, req.user.id);
  sendResponse(res, 200, { message: 'Import tarif kuliah selesai', data: result });
});

const importTemplate = catchAsync(async (req, res) => {
  const workbook = tarifKuliahService.exportTarifKuliahTemplate();
  await sendWorkbook(res, workbook, 'template-import-tarif-kuliah.xlsx');
});

module.exports = { list, detail, create, update, remove, exportExcel, importExcel, importTemplate };
