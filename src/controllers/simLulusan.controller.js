const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/simLulusan.service');

const list = catchAsync(async (req, res) => {
  const { tahun, jurusanId } = req.query;
  const data = await service.listLulusan({
    tahun: tahun ? Number(tahun) : undefined,
    jurusanId: jurusanId ? Number(jurusanId) : undefined,
  });
  sendResponse(res, 200, { message: 'Data lulusan fetched', data });
});

const tahunLulusOptions = catchAsync(async (req, res) => {
  const data = await service.getTahunLulusOptions();
  sendResponse(res, 200, { message: 'Tahun lulus options fetched', data });
});

const prodiOptions = catchAsync(async (req, res) => {
  const data = await service.getProdiOptions();
  sendResponse(res, 200, { message: 'Prodi options fetched', data });
});

module.exports = { list, tahunLulusOptions, prodiOptions };
