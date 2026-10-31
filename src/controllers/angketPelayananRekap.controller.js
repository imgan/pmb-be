const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const angketPelayananService = require('../services/angketPelayanan.service');

// req.query.jurusanId diisi middleware prodiScope (akun Prodi terkunci ke prodinya).
const rekap = catchAsync(async (req, res) => {
  const data = await angketPelayananService.getRekap(req.query);
  sendResponse(res, 200, { message: 'Rekap angket pelayanan fetched', data });
});

module.exports = { rekap };
