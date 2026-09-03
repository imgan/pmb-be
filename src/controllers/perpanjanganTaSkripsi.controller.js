const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/perpanjanganTaSkripsi.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await service.listPerpanjangan(req.query);
  sendResponse(res, 200, { message: 'Perpanjangan TA/Skripsi fetched', data, meta });
});

const tarif = catchAsync(async (req, res) => {
  const data = await service.getTarifPerpanjangan(req.query.nim, req.query.periode);
  sendResponse(res, 200, { message: 'Tarif perpanjangan fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await service.createPerpanjangan(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Perpanjangan TA/Skripsi created', data });
});

const remove = catchAsync(async (req, res) => {
  await service.deletePerpanjangan(req.params.id);
  sendResponse(res, 200, { message: 'Perpanjangan TA/Skripsi deleted' });
});

module.exports = { list, tarif, create, remove };
