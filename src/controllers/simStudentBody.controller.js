const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/simStudentBody.service');

const list = catchAsync(async (req, res) => {
  const data = await service.listStudentBody();
  sendResponse(res, 200, { message: 'Student body fetched', data });
});

module.exports = { list };
