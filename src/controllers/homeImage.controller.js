const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const homeImageService = require('../services/homeImage.service');

const detail = catchAsync(async (req, res) => {
  const data = await homeImageService.getHomeImages();
  sendResponse(res, 200, { message: 'Home images fetched', data });
});

const update = catchAsync(async (req, res) => {
  const data = await homeImageService.updateHomeImages(req.body, req.user.id);
  sendResponse(res, 200, { message: 'Home images updated', data });
});

module.exports = { detail, update };
