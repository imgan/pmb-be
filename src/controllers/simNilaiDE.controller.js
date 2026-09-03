const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/simNilaiDE.service');

const list = catchAsync(async (req, res) => {
  const { prodi, kodeMataKuliah } = req.query;
  const data = await service.listNilaiDE({
    prodi: prodi || undefined,
    kodeMataKuliah: kodeMataKuliah || undefined,
  });
  sendResponse(res, 200, { message: 'Nilai D & E fetched', data });
});

module.exports = { list };
