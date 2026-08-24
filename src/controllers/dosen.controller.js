const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const { sendWorkbook } = require('../utils/excel');
const dosenService = require('../services/dosen.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await dosenService.listDosen(req.query);
  sendResponse(res, 200, { message: 'Dosen fetched', data, meta });
});

const stats = catchAsync(async (req, res) => {
  const data = await dosenService.getDosenStats();
  sendResponse(res, 200, { message: 'Dosen stats fetched', data });
});

const detail = catchAsync(async (req, res) => {
  const data = await dosenService.getDosenById(req.params.id);
  sendResponse(res, 200, { message: 'Dosen fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await dosenService.createDosen(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Dosen created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await dosenService.updateDosen(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Dosen updated', data });
});

const remove = catchAsync(async (req, res) => {
  await dosenService.deleteDosen(req.params.id, req.user.id);
  sendResponse(res, 200, { message: 'Dosen deleted' });
});

const exportExcel = catchAsync(async (req, res) => {
  const workbook = await dosenService.exportDosen();
  await sendWorkbook(res, workbook, 'dosen.xlsx');
});

const importExcel = catchAsync(async (req, res) => {
  const result = await dosenService.importDosen(req.body.file, req.user.id);
  sendResponse(res, 200, { message: 'Import dosen selesai', data: result });
});

const importTemplate = catchAsync(async (req, res) => {
  const workbook = dosenService.exportDosenTemplate();
  await sendWorkbook(res, workbook, 'template-import-dosen.xlsx');
});

module.exports = { list, stats, detail, create, update, remove, exportExcel, importExcel, importTemplate };
