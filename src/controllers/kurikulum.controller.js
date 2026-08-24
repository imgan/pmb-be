const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const kurikulumService = require('../services/kurikulum.service');

const list = catchAsync(async (req, res) => {
  const { data, meta } = await kurikulumService.listKurikulum(req.query);
  sendResponse(res, 200, { message: 'Kurikulum fetched', data, meta });
});

const listAktif = catchAsync(async (req, res) => {
  const { data, meta } = await kurikulumService.listMatakuliahAktif(req.query);
  sendResponse(res, 200, { message: 'Matakuliah aktif fetched', data, meta });
});

const detail = catchAsync(async (req, res) => {
  const data = await kurikulumService.getKurikulumById(req.params.id);
  sendResponse(res, 200, { message: 'Kurikulum fetched', data });
});

const create = catchAsync(async (req, res) => {
  const data = await kurikulumService.createKurikulum(req.body, req.user.id);
  sendResponse(res, 201, { message: 'Kurikulum created', data });
});

const update = catchAsync(async (req, res) => {
  const data = await kurikulumService.updateKurikulum(req.params.id, req.body, req.user.id);
  sendResponse(res, 200, { message: 'Kurikulum updated', data });
});

const remove = catchAsync(async (req, res) => {
  await kurikulumService.deleteKurikulum(req.params.id);
  sendResponse(res, 200, { message: 'Kurikulum deleted' });
});

module.exports = { list, listAktif, detail, create, update, remove };
