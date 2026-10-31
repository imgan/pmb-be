const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const service = require('../services/impersonasi.service');

const LISTERS = { staff: service.listStaff, dosen: service.listDosen, mahasiswa: service.listMahasiswa };
const IMPERSONATORS = { staff: service.impersonateStaff, dosen: service.impersonateDosen, mahasiswa: service.impersonateMahasiswa };

const list = catchAsync(async (req, res) => {
  const { data, meta } = await LISTERS[req.params.tipe](req.query);
  sendResponse(res, 200, { message: 'Daftar akun fetched', data, meta });
});

const impersonate = catchAsync(async (req, res) => {
  const data = await IMPERSONATORS[req.params.tipe](req.params.id, req.user);
  sendResponse(res, 200, { message: 'Impersonasi berhasil', data });
});

module.exports = { list, impersonate };
