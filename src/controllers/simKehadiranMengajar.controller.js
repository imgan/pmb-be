const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/simKehadiranMengajar.service');

const list = catchAsync(async (req, res) => {
  const { tahunAjaranId, dosenId } = req.query;
  const data = await service.listKehadiranMengajar({
    tahunAjaranId: tahunAjaranId ? Number(tahunAjaranId) : undefined,
    dosenId: dosenId ? Number(dosenId) : undefined,
  });
  sendResponse(res, 200, { message: 'Kehadiran mengajar fetched', data });
});

module.exports = { list };
