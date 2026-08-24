const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const { sendWorkbook } = require('../utils/excel');
const pendaftarSidangService = require('../services/pendaftarSidang.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await pendaftarSidangService.listPendaftarSidang(req.query);
  sendResponse(res, 200, { message: 'Pendaftar sidang fetched', data, meta });
});

const exportExcel = catchAsync(async (req, res) => {
  const workbook = await pendaftarSidangService.exportPendaftarSidang();
  await sendWorkbook(res, workbook, 'rekap-bimbingan.xlsx');
});

const filterOptions = catchAsync(async (req, res) => {
  const data = await pendaftarSidangService.getFilterOptions();
  sendResponse(res, 200, { message: 'Filter options fetched', data });
});

const detail = catchAsync(async (req, res) => {
  const data = await pendaftarSidangService.getPendaftarSidangById(req.params.id);
  sendResponse(res, 200, { message: 'Pendaftar sidang fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await pendaftarSidangService.createPendaftarSidang(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Pendaftar sidang created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await pendaftarSidangService.updatePendaftarSidang(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Pendaftar sidang updated', data });
});

const remove = catchAsync(async (req, res) => {
  await pendaftarSidangService.deletePendaftarSidang(req.params.id);
  sendResponse(res, 200, { message: 'Pendaftar sidang deleted' });
});

module.exports = { list, filterOptions, exportExcel, detail, create, update, remove };
