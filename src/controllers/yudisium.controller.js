const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const yudisiumService = require('../services/yudisium.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await yudisiumService.listYudisium(req.query);
  sendResponse(res, 200, { message: 'Yudisium fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await yudisiumService.getYudisiumById(req.params.id);
  sendResponse(res, 200, { message: 'Yudisium fetched', data });
});

const update = catchAsync(async (req, res) => {
  const data = await yudisiumService.updateYudisium(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Yudisium updated', data });
});

module.exports = { list, detail, update };
