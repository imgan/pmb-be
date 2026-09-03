const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const { sendWorkbook } = require('../utils/excel');
const jurusanService = require('../services/jurusan.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await jurusanService.listJurusan(req.query);
  sendResponse(res, 200, { message: 'Jurusan fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await jurusanService.getJurusanById(req.params.id);
  sendResponse(res, 200, { message: 'Jurusan fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await jurusanService.createJurusan(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Jurusan created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await jurusanService.updateJurusan(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Jurusan updated', data });
});

const remove = catchAsync(async (req, res) => {
  await jurusanService.deleteJurusan(req.params.id, req.user.id);
  sendResponse(res, 200, { message: 'Jurusan deleted' });
});

const exportExcel = catchAsync(async (req, res) => {
  const workbook = await jurusanService.exportJurusan();
  await sendWorkbook(res, workbook, 'jurusan.xlsx');
});

const importExcel = catchAsync(async (req, res) => {
  const result = await jurusanService.importJurusan(req.body.file, req.user.id);
  sendResponse(res, 200, { message: 'Import jurusan selesai', data: result });
});

const importTemplate = catchAsync(async (req, res) => {
  const workbook = jurusanService.exportJurusanTemplate();
  await sendWorkbook(res, workbook, 'template-import-jurusan.xlsx');
});

module.exports = { list, detail, create, update, remove, exportExcel, importExcel, importTemplate };
