const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/bimbinganTa.service');

// ---- Portal mahasiswa ----
const kartuMahasiswa = catchAsync(async (req, res) => {
  const data = await service.getKartuMahasiswa(req.mahasiswa.id);
  sendResponse(res, 200, { message: 'Kartu bimbingan fetched', data });
});

// ---- Portal dosen ----
const listPeriode = catchAsync(async (req, res) => {
  const data = await service.listPeriodeDosen(req.dosen.id);
  sendResponse(res, 200, { message: 'Periode pembimbing TA fetched', data });
});
const listMahasiswa = catchAsync(async (req, res) => {
  const data = await service.listMahasiswaBimbingan(req.dosen.id, { periodeId: Number(req.query.periodeId) || null });
  sendResponse(res, 200, { message: 'Mahasiswa bimbingan TA fetched', data });
});
const kartuDosen = catchAsync(async (req, res) => {
  const data = await service.getKartuDosen(req.dosen.id, Number(req.params.pengajuanId));
  sendResponse(res, 200, { message: 'Kartu bimbingan fetched', data });
});
const tambah = catchAsync(async (req, res) => {
  const data = await service.tambahCatatan(req.dosen.id, Number(req.params.pengajuanId), req.body);
  sendResponse(res, 201, { message: 'Catatan bimbingan ditambahkan', data });
});
const ubah = catchAsync(async (req, res) => {
  const data = await service.ubahCatatan(req.dosen.id, Number(req.params.id), req.body);
  sendResponse(res, 200, { message: 'Catatan bimbingan diperbarui', data });
});
const hapus = catchAsync(async (req, res) => {
  const data = await service.hapusCatatan(req.dosen.id, Number(req.params.id));
  sendResponse(res, 200, { message: 'Catatan bimbingan dihapus', data });
});

module.exports = { kartuMahasiswa, listPeriode, listMahasiswa, kartuDosen, tambah, ubah, hapus };
