const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/simKehadiranKelas.service');

const list = catchAsync(async (req, res) => {
  const { tahun, semester } = req.query;
  const data = await service.listKehadiranKelas({
    tahun: tahun ? Number(tahun) : undefined,
    semester: semester ? Number(semester) : undefined,
  });
  sendResponse(res, 200, { message: 'Kehadiran kelas fetched', data });
});

module.exports = { list };
