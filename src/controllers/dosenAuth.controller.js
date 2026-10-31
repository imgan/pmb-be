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

const updatePhoto = catchAsync(async (req, res) => {
  const data = await dosenAuthService.updatePhoto(req.dosen.id, req.body.photo);
  sendResponse(res, 200, { message: 'Foto profil diperbarui', data });
});

const changePassword = catchAsync(async (req, res) => {
  await dosenAuthService.changePassword(req.dosen.id, req.body.oldPassword, req.body.newPassword);
  sendResponse(res, 200, { message: 'Password berhasil diubah' });
});

module.exports = { login, me, updatePhoto, changePassword };
