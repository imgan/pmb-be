const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const kurikulumService = require('../services/kurikulum.service');
const matakuliahAktifService = require('../services/matakuliahAktif.service');

// ---- Kurikulum (header) ----
const list = catchAsync(async (req, res) => {
  const { data, meta } = await kurikulumService.listKurikulum(req.query);
  sendResponse(res, 200, { message: 'Kurikulum fetched', data, meta });
});

const options = catchAsync(async (req, res) => {
  const data = await kurikulumService.getKurikulumOptions(req.query);
  sendResponse(res, 200, { message: 'Pilihan kurikulum fetched', data });
});

const tahunOptions = catchAsync(async (req, res) => {
  const data = await kurikulumService.getTahunKurikulumOptions();
  sendResponse(res, 200, { message: 'Tahun kurikulum fetched', data });
});

const detail = catchAsync(async (req, res) => {
  const data = await kurikulumService.getKurikulumById(req.params.id);
  sendResponse(res, 200, { message: 'Kurikulum fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await kurikulumService.createKurikulum(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Kurikulum dibuat', data });
});

const update = catchAsync(async (req, res) => {
  const data = await kurikulumService.updateKurikulum(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Kurikulum diperbarui', data });
});

const remove = catchAsync(async (req, res) => {
  await kurikulumService.deleteKurikulum(req.params.id, req.user.id);
  sendResponse(res, 200, { message: 'Kurikulum dihapus' });
});

// ---- Matakuliah Aktif ----
const listAktif = catchAsync(async (req, res) => {
  const data = await matakuliahAktifService.listMatakuliahAktif(req.query);
  sendResponse(res, 200, { message: 'Matakuliah aktif fetched', data });
});

const setAktif = catchAsync(async (req, res) => {
  const data = await matakuliahAktifService.setMatakuliahAktif(req.body, req.user.id);
  sendResponse(res, 200, { message: req.body.aktif ? 'Matakuliah diaktifkan' : 'Matakuliah dinonaktifkan', data });
});

module.exports = { list, options, tahunOptions, detail, create, update, remove, listAktif, setAktif };
