const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const kampusService = require('../services/kampus.service');

const detail = catchAsync(async (req, res) => {
  const data = await kampusService.getKampus();
  sendResponse(res, 200, { message: 'Kampus fetched', data });
});

const update = catchAsync(async (req, res) => {
  const data = await kampusService.updateKampus(req.body, req.user.id);
  sendResponse(res, 200, { message: 'Kampus updated', data });
});

module.exports = { detail, update };
