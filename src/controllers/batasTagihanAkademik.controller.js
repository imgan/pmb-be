const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/batasTagihanAkademik.service');

const list = catchAsync(async (req, res) => {
  const data = await service.listPerProdi();
  sendResponse(res, 200, { message: 'Batas tagihan akademik fetched', data });
});

const update = catchAsync(async (req, res) => {
  const data = await service.upsertByJurusan(req.params.jurusanId, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Batas tagihan akademik updated', data });
});

const statusMahasiswa = catchAsync(async (req, res) => {
  const data = await service.listStatusMahasiswa(req.query);
  sendResponse(res, 200, { message: 'Status cekal mahasiswa fetched', data });
});

module.exports = { list, update, statusMahasiswa };
