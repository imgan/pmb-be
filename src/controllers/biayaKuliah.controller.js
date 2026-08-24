const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const biayaKuliahService = require('../services/biayaKuliah.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await biayaKuliahService.listBiayaKuliah(req.query);
  sendResponse(res, 200, { message: 'Biaya kuliah fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await biayaKuliahService.getBiayaKuliahById(req.params.id);
  sendResponse(res, 200, { message: 'Biaya kuliah fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await biayaKuliahService.createBiayaKuliah(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Biaya kuliah created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await biayaKuliahService.updateBiayaKuliah(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Biaya kuliah updated', data });
});

const remove = catchAsync(async (req, res) => {
  await biayaKuliahService.deleteBiayaKuliah(req.params.id);
  sendResponse(res, 200, { message: 'Biaya kuliah deleted' });
});

module.exports = { list, detail, create, update, remove };
