const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const calonMahasiswaService = require('../services/calonMahasiswa.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await calonMahasiswaService.listCalonMahasiswa(req.query);
  sendResponse(res, 200, { message: 'Calon mahasiswa fetched', data, meta });
});

const stats = catchAsync(async (req, res) => {
  const data = await calonMahasiswaService.getStats(req.query);
  sendResponse(res, 200, { message: 'Stats fetched', data });
});

const detail = catchAsync(async (req, res) => {
  const data = await calonMahasiswaService.getCalonMahasiswaById(req.params.id);
  sendResponse(res, 200, { message: 'Calon mahasiswa fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await calonMahasiswaService.createCalonMahasiswa(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Calon mahasiswa created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await calonMahasiswaService.updateCalonMahasiswa(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Calon mahasiswa updated', data });
});

const remove = catchAsync(async (req, res) => {
  await calonMahasiswaService.deleteCalonMahasiswa(req.params.id);
  sendResponse(res, 200, { message: 'Calon mahasiswa deleted' });
});

module.exports = { list, stats, detail, create, update, remove };
