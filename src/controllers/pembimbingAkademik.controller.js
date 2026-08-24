const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const pembimbingAkademikService = require('../services/pembimbingAkademik.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await pembimbingAkademikService.listPembimbingAkademik(req.query);
  sendResponse(res, 200, { message: 'Pembimbing akademik fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await pembimbingAkademikService.getPembimbingAkademikById(req.params.id);
  sendResponse(res, 200, { message: 'Pembimbing akademik fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await pembimbingAkademikService.createPembimbingAkademik(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Pembimbing akademik created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await pembimbingAkademikService.updatePembimbingAkademik(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Pembimbing akademik updated', data });
});

const remove = catchAsync(async (req, res) => {
  await pembimbingAkademikService.deletePembimbingAkademik(req.params.id);
  sendResponse(res, 200, { message: 'Pembimbing akademik deleted' });
});

module.exports = { list, detail, create, update, remove };
