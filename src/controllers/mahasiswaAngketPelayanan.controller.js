const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const service = require('../services/angketPelayanan.service');

const getStatus = catchAsync(async (req, res) => {
  const { tahunAjaranId } = req.query;
  if (!tahunAjaranId) throw new ApiError(400, 'tahunAjaranId wajib diisi');
  const data = await service.getStatus(req.mahasiswa.id, tahunAjaranId);
  sendResponse(res, 200, { message: 'Angket pelayanan fetched', data });
});

const submit = catchAsync(async (req, res) => {
  await service.submit(req.mahasiswa.id, req.body);
  sendResponse(res, 201, { message: 'Angket pelayanan berhasil dikirim' });
});

module.exports = { getStatus, submit };
