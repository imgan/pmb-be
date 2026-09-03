const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/simPresentaseKehadiran.service');

const list = catchAsync(async (req, res) => {
  const { tahun, semester } = req.query;
  const data = await service.listPresentaseKehadiran({
    tahun: tahun ? Number(tahun) : undefined,
    semester: semester || undefined,
  });
  sendResponse(res, 200, { message: 'Presentase kehadiran mahasiswa fetched', data });
});

module.exports = { list };
