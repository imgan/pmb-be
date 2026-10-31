const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/pengajuanTa.service');

// ---- Prodi: periode ----
const listPeriode = catchAsync(async (req, res) => {
  const { data, meta } = await service.listPeriode(req.query);
  sendResponse(res, 200, { message: 'Periode pengajuan TA fetched', data, meta });
});
const createPeriode = catchAsync(async (req, res) => {
  const data = await service.createPeriode(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Periode pengajuan TA dibuat', data });
});
const updatePeriode = catchAsync(async (req, res) => {
  const data = await service.updatePeriode(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Periode pengajuan TA diperbarui', data });
});
const deletePeriode = catchAsync(async (req, res) => {
  await service.deletePeriode(req.params.id, req.user.id);
  sendResponse(res, 200, { message: 'Periode pengajuan TA dihapus' });
});

// ---- Prodi: pengajuan ----
const listPengajuan = catchAsync(async (req, res) => {
  const { data, meta } = await service.listPengajuan(req.query);
  sendResponse(res, 200, { message: 'Pengajuan TA fetched', data, meta });
});
const verifikasi = catchAsync(async (req, res) => {
  const data = await service.verifikasiPengajuan(Number(req.params.id), req.body, req.user.id);
  sendResponse(res, 200, { message: 'Pengajuan TA diverifikasi', data });
});

// ---- Portal mahasiswa ----
const formMahasiswa = catchAsync(async (req, res) => {
  const data = await service.getFormMahasiswa(req.mahasiswa.id);
  sendResponse(res, 200, { message: 'Form pengajuan TA fetched', data });
});
const ajukanMahasiswa = catchAsync(async (req, res) => {
  const { pengajuan, diperbarui } = await service.ajukanMahasiswa(req.mahasiswa.id, req.body);
  sendResponse(res, diperbarui ? 200 : 201, { message: diperbarui ? 'Pengajuan TA diperbarui' : 'Pengajuan TA berhasil dikirim', data: pengajuan });
});
const batalkanMahasiswa = catchAsync(async (req, res) => {
  await service.batalkanMahasiswa(req.mahasiswa.id, Number(req.params.id));
  sendResponse(res, 200, { message: 'Pengajuan TA dibatalkan' });
});

module.exports = { listPeriode, createPeriode, updatePeriode, deletePeriode, listPengajuan, verifikasi, formMahasiswa, ajukanMahasiswa, batalkanMahasiswa };
