const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/ApiResponse');
const dosenAuthService = require('../services/dosenAuth.service');

const login = catchAsync(async (req, res) => {
  const data = await dosenAuthService.loginDosen(req.body);
  sendResponse(res, 200, { message: 'Login berhasil', data });
});

const me = catchAsync(async (req, res) => {
  const data = await dosenAuthService.getProfile(req.dosen.id);
  sendResponse(res, 200, { message: 'Profile fetched', data });
});

module.exports = { login, me };
