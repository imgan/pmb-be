const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
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

module.exports = { list, detail, create, update, remove };
