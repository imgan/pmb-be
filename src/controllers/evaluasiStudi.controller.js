const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/evaluasiStudi.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await service.listEvaluasiStudi(req.query);
  sendResponse(res, 200, { message: 'Evaluasi studi fetched', data, meta });
});

module.exports = { list };
