const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const golonganKelasService = require('../services/golonganKelas.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await golonganKelasService.listGolonganKelas(req.query);
  sendResponse(res, 200, { message: 'Golongan kelas fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await golonganKelasService.getGolonganKelasById(req.params.id);
  sendResponse(res, 200, { message: 'Golongan kelas fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await golonganKelasService.createGolonganKelas(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Golongan kelas created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await golonganKelasService.updateGolonganKelas(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Golongan kelas updated', data });
});

const remove = catchAsync(async (req, res) => {
  await golonganKelasService.deleteGolonganKelas(req.params.id, req.user.id);
  sendResponse(res, 200, { message: 'Golongan kelas deleted' });
});

module.exports = { list, detail, create, update, remove };
