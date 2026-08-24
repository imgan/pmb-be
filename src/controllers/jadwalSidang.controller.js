const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const jadwalSidangService = require('../services/jadwalSidang.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await jadwalSidangService.listJadwalSidang(req.query);
  sendResponse(res, 200, { message: 'Jadwal sidang fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await jadwalSidangService.getJadwalSidangById(req.params.id);
  sendResponse(res, 200, { message: 'Jadwal sidang fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await jadwalSidangService.createJadwalSidang(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Jadwal sidang created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await jadwalSidangService.updateJadwalSidang(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Jadwal sidang updated', data });
});

const remove = catchAsync(async (req, res) => {
  await jadwalSidangService.deleteJadwalSidang(req.params.id);
  sendResponse(res, 200, { message: 'Jadwal sidang deleted' });
});

module.exports = { list, detail, create, update, remove };
