const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const ruanganService = require('../services/ruangan.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await ruanganService.listRuangan(req.query);
  sendResponse(res, 200, { message: 'Ruangan fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await ruanganService.getRuanganById(req.params.id);
  sendResponse(res, 200, { message: 'Ruangan fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await ruanganService.createRuangan(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Ruangan created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await ruanganService.updateRuangan(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Ruangan updated', data });
});

const remove = catchAsync(async (req, res) => {
  await ruanganService.deleteRuangan(req.params.id, req.user.id);
  sendResponse(res, 200, { message: 'Ruangan deleted' });
});

module.exports = { list, detail, create, update, remove };
