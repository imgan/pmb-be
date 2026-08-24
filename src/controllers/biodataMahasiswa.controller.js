const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const biodataMahasiswaService = require('../services/biodataMahasiswa.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await biodataMahasiswaService.listBiodataMahasiswa(req.query);
  sendResponse(res, 200, { message: 'Biodata mahasiswa fetched', data, meta });
});

module.exports = { list };
