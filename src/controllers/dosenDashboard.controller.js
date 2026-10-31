const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/dosenDashboard.service');

const dashboard = catchAsync(async (req, res) => {
  const data = await service.getDashboard(req.dosen.id, req.tahunAjaranId);
  sendResponse(res, 200, { message: 'Dashboard dosen fetched', data });
});

const updateBiodata = catchAsync(async (req, res) => {
  const data = await service.updateBiodata(req.dosen.id, req.body);
  sendResponse(res, 200, { message: 'Biodata diperbarui', data });
});

const tambahRiwayat = catchAsync(async (req, res) => {
  const data = await service.tambahRiwayat(req.dosen.id, req.body);
  sendResponse(res, 201, { message: 'Riwayat pendidikan ditambahkan', data });
});

const ubahRiwayat = catchAsync(async (req, res) => {
  const data = await service.ubahRiwayat(req.dosen.id, Number(req.params.id), req.body);
  sendResponse(res, 200, { message: 'Riwayat pendidikan diperbarui', data });
});

const hapusRiwayat = catchAsync(async (req, res) => {
  const data = await service.hapusRiwayat(req.dosen.id, Number(req.params.id));
  sendResponse(res, 200, { message: 'Riwayat pendidikan dihapus', data });
});

module.exports = { dashboard, updateBiodata, tambahRiwayat, ubahRiwayat, hapusRiwayat };
