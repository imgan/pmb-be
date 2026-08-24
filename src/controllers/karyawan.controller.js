const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const { sendWorkbook } = require('../utils/excel');
const karyawanService = require('../services/karyawan.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await karyawanService.listKaryawan(req.query);
  sendResponse(res, 200, { message: 'Karyawan fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await karyawanService.getKaryawanById(req.params.id);
  sendResponse(res, 200, { message: 'Karyawan fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await karyawanService.createKaryawan(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Karyawan created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await karyawanService.updateKaryawan(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Karyawan updated', data });
});

const remove = catchAsync(async (req, res) => {
  await karyawanService.deleteKaryawan(req.params.id);
  sendResponse(res, 200, { message: 'Karyawan deleted' });
});

const genderSummary = catchAsync(async (req, res) => {
  const data = await karyawanService.getGenderSummary();
  sendResponse(res, 200, { message: 'Karyawan gender summary fetched', data });
});

const exportExcel = catchAsync(async (req, res) => {
  const workbook = await karyawanService.exportKaryawan();
  await sendWorkbook(res, workbook, 'karyawan.xlsx');
});

const importExcel = catchAsync(async (req, res) => {
  const result = await karyawanService.importKaryawan(req.body.file, req.user.id);
  sendResponse(res, 200, { message: 'Import karyawan selesai', data: result });
});

const importTemplate = catchAsync(async (req, res) => {
  const workbook = karyawanService.exportKaryawanTemplate();
  await sendWorkbook(res, workbook, 'template-import-karyawan.xlsx');
});

module.exports = { list, detail, create, update, remove, genderSummary, exportExcel, importExcel, importTemplate };
