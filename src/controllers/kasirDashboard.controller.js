const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/kasirDashboard.service');

const dashboard = catchAsync(async (req, res) => {
  const data = await service.getDashboard();
  sendResponse(res, 200, { message: 'Dashboard kasir fetched', data });
});

module.exports = { dashboard };
