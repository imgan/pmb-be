const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/tagihanKuliah.service');

const generate = catchAsync(async (req, res) => {
  const data = await service.generateTagihan(req.body.tahunAjaranId, req.user.id);
  sendResponse(res, 201, { message: `${data.generated} tagihan baru dibuat, ${data.updated} tagihan diperbarui`, data });
});

const list = catchAsync(async (req, res) => {
  const { data, meta } = await service.listTagihan(req.query);
  sendResponse(res, 200, { message: 'Tagihan kuliah fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await service.getTagihanById(req.params.id);
  sendResponse(res, 200, { message: 'Tagihan kuliah fetched', data });
});

const cariByNim = catchAsync(async (req, res) => {
  const search = req.query.nim ?? req.query.search;
  const data = await service.findTagihanAktifByNim(search, req.query.tahunAjaranId);
  sendResponse(res, 200, { message: 'Tagihan kuliah fetched', data });
});

module.exports = { generate, list, detail, cariByNim };
