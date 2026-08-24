const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const mataKuliahService = require('../services/mataKuliah.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await mataKuliahService.listMataKuliah(req.query);
  sendResponse(res, 200, { message: 'Mata kuliah fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await mataKuliahService.getMataKuliahById(req.params.id);
  sendResponse(res, 200, { message: 'Mata kuliah fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await mataKuliahService.createMataKuliah(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Mata kuliah created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await mataKuliahService.updateMataKuliah(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Mata kuliah updated', data });
});

const remove = catchAsync(async (req, res) => {
  await mataKuliahService.deleteMataKuliah(req.params.id, req.user.id);
  sendResponse(res, 200, { message: 'Mata kuliah deleted' });
});

module.exports = { list, detail, create, update, remove };
