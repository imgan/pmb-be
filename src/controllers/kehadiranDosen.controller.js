const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const kehadiranDosenService = require('../services/kehadiranDosen.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await kehadiranDosenService.listKehadiranDosen(req.query);
  sendResponse(res, 200, { message: 'Kehadiran dosen fetched', data, meta });
});

const statusSummary = catchAsync(async (req, res) => {
  const data = await kehadiranDosenService.getStatusSummary();
  sendResponse(res, 200, { message: 'Status summary fetched', data });
});

const detail = catchAsync(async (req, res) => {
  const data = await kehadiranDosenService.getKehadiranDosenById(req.params.id);
  sendResponse(res, 200, { message: 'Kehadiran dosen fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await kehadiranDosenService.createKehadiranDosen(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Kehadiran dosen created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await kehadiranDosenService.updateKehadiranDosen(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Kehadiran dosen updated', data });
});

const remove = catchAsync(async (req, res) => {
  await kehadiranDosenService.deleteKehadiranDosen(req.params.id, req.user.id);
  sendResponse(res, 200, { message: 'Kehadiran dosen deleted' });
});

module.exports = { list, statusSummary, detail, create, update, remove };
