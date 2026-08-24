const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const laporanIjazahService = require('../services/laporanIjazah.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await laporanIjazahService.listGraduates(req.query);
  sendResponse(res, 200, { message: 'Data master lulusan fetched', data, meta });
});

const tahunLulusOptions = catchAsync(async (req, res) => {
  const data = await laporanIjazahService.getTahunLulusOptions();
  sendResponse(res, 200, { message: 'Tahun lulus options fetched', data });
});

module.exports = { list, tahunLulusOptions };
