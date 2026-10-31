const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/mahasiswaKkp.service');

const getForm = catchAsync(async (req, res) => {
  const data = await service.getFormKkp(req.mahasiswa.id);
  sendResponse(res, 200, { message: 'Form pendaftaran KKP fetched', data });
});

const save = catchAsync(async (req, res) => {
  const data = await service.saveKkp(req.mahasiswa.id, req.body);
  sendResponse(res, 200, { message: 'Pendaftaran KKP disimpan', data });
});

module.exports = { getForm, save };
