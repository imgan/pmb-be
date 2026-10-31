const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/kesediaanMengajar.service');

// req.tahunAjaranId = pilihan Setting Tahun Akademik dosen (dosenAuth.middleware); null → tahun aktif.
const get = catchAsync(async (req, res) => {
  const data = await service.getKesediaan(req.dosen.id, req.tahunAjaranId);
  sendResponse(res, 200, { message: 'Kesediaan mengajar fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await service.createKesediaan(req.dosen.id, req.tahunAjaranId, req.body);
  sendResponse(res, 201, { message: 'Kesediaan mengajar ditambahkan', data });
});

const update = catchAsync(async (req, res) => {
  const data = await service.updateKesediaan(req.dosen.id, Number(req.params.id), req.body);
  sendResponse(res, 200, { message: 'Kesediaan mengajar diperbarui', data });
});

const remove = catchAsync(async (req, res) => {
  await service.deleteKesediaan(req.dosen.id, Number(req.params.id));
  sendResponse(res, 200, { message: 'Kesediaan mengajar dihapus' });
});

module.exports = { get, create, update, remove };
