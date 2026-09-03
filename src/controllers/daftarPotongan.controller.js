const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const { sendWorkbook } = require('../utils/excel');
const daftarPotonganService = require('../services/daftarPotongan.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await daftarPotonganService.listDaftarPotongan(req.query);
  sendResponse(res, 200, { message: 'Daftar potongan fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await daftarPotonganService.getDaftarPotonganById(req.params.id);
  sendResponse(res, 200, { message: 'Daftar potongan fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await daftarPotonganService.createDaftarPotongan(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Daftar potongan created', data });
});

const remove = catchAsync(async (req, res) => {
  await daftarPotonganService.deleteDaftarPotongan(req.params.id);
  sendResponse(res, 200, { message: 'Daftar potongan deleted' });
});

const exportExcel = catchAsync(async (req, res) => {
  const workbook = await daftarPotonganService.exportDaftarPotongan();
  await sendWorkbook(res, workbook, 'daftar-potongan.xlsx');
});

const importExcel = catchAsync(async (req, res) => {
  const result = await daftarPotonganService.importDaftarPotongan(req.body.file, req.user.id);
  sendResponse(res, 200, { message: 'Import daftar potongan selesai', data: result });
});

const importTemplate = catchAsync(async (req, res) => {
  const workbook = daftarPotonganService.exportDaftarPotonganTemplate();
  await sendWorkbook(res, workbook, 'template-import-daftar-potongan.xlsx');
});

module.exports = { list, detail, create, remove, exportExcel, importExcel, importTemplate };
