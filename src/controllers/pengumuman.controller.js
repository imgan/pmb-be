const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const pengumumanService = require('../services/pengumuman.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await pengumumanService.listPengumuman(req.query);
  sendResponse(res, 200, { message: 'Pengumuman fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await pengumumanService.getPengumumanById(req.params.id);
  sendResponse(res, 200, { message: 'Pengumuman fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await pengumumanService.createPengumuman(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Pengumuman created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await pengumumanService.updatePengumuman(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Pengumuman updated', data });
});

const remove = catchAsync(async (req, res) => {
  await pengumumanService.deletePengumuman(req.params.id, req.user.id);
  sendResponse(res, 200, { message: 'Pengumuman deleted' });
});

module.exports = { list, detail, create, update, remove };
