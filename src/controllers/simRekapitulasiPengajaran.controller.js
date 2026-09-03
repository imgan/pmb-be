const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/simRekapitulasiPengajaran.service');

const list = catchAsync(async (req, res) => {
  const { tahunAjaranId } = req.query;
  const data = await service.listRekapitulasiPengajaran({
    tahunAjaranId: tahunAjaranId ? Number(tahunAjaranId) : undefined,
  });
  sendResponse(res, 200, { message: 'Rekapitulasi pengajaran fetched', data });
});

module.exports = { list };
