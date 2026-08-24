const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const dinasCutiLupaFingerService = require('../services/dinasCutiLupaFinger.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await dinasCutiLupaFingerService.listDinasCuti(req.query);
  sendResponse(res, 200, { message: 'Data dinas/cuti/lupa finger fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await dinasCutiLupaFingerService.getDinasCutiById(req.params.id);
  sendResponse(res, 200, { message: 'Data dinas/cuti/lupa finger fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await dinasCutiLupaFingerService.createDinasCuti(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Data dinas/cuti/lupa finger created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await dinasCutiLupaFingerService.updateDinasCuti(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Data dinas/cuti/lupa finger updated', data });
});

const remove = catchAsync(async (req, res) => {
  await dinasCutiLupaFingerService.deleteDinasCuti(req.params.id);
  sendResponse(res, 200, { message: 'Data dinas/cuti/lupa finger deleted' });
});

module.exports = { list, detail, create, update, remove };
