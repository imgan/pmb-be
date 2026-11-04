const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { Dosen } = require('../models');
const ApiError = require('../utils/ApiError');
const { generateAccessToken } = require('../utils/jwt');

// Username login dosen = NIP (disimpan di kolom `nik`); NIDN & email tetap diterima.
const loginDosen = async ({ nip, nidn, email, password }) => {
  const identifier = nip ?? nidn;
  const where = identifier ? { [Op.or]: [{ nik: identifier }, { nidn: identifier }] } : { email };
  // Scope withPassword menggantikan defaultScope, jadi filter isDelete ditulis ulang di sini.
  const dosen = await Dosen.scope('withPassword').findOne({ where: { ...where, isDelete: false } });
  if (!dosen || !dosen.password) throw new ApiError(401, 'NIP atau password salah');
  if (!dosen.isActive) throw new ApiError(403, 'Akun dosen tidak aktif');

  const isMatch = await bcrypt.compare(password, dosen.password);
  if (!isMatch) throw new ApiError(401, 'NIP atau password salah');

  // silent: login bukan perubahan data dosen, updated_at tidak ikut berubah.
  await Dosen.update({ lastLoginAt: new Date() }, { where: { id: dosen.id }, silent: true });

  const accessToken = generateAccessToken({ sub: dosen.id, type: 'dosen' });
  return { dosen: await Dosen.findByPk(dosen.id), accessToken };
};

/** Profil dosen login termasuk foto (foto dikecualikan dari defaultScope). */
const getProfile = async (dosenId) => {
  const dosen = await Dosen.unscoped().findOne({ where: { id: dosenId, isDelete: false }, attributes: { exclude: ['password'] } });
  if (!dosen) throw new ApiError(404, 'Dosen not found');
  return dosen;
};

// Foto berupa data URL gambar base64; dibatasi ~2 MB supaya tidak membebani database.
const MAX_FOTO_CHARS = 2.8 * 1024 * 1024;

const updatePhoto = async (dosenId, photo) => {
  if (photo && !/^data:image\/(png|jpe?g|webp);base64,/i.test(photo)) throw new ApiError(400, 'Foto harus berupa gambar PNG, JPG, atau WEBP');
  if (photo && photo.length > MAX_FOTO_CHARS) throw new ApiError(400, 'Ukuran foto maksimal 2 MB');
  await Dosen.unscoped().update({ photo: photo || null }, { where: { id: dosenId, isDelete: false } });
  return getProfile(dosenId);
};

const changePassword = async (dosenId, oldPassword, newPassword) => {
  const dosen = await Dosen.scope('withPassword').findOne({ where: { id: dosenId, isDelete: false } });
  if (!dosen) throw new ApiError(404, 'Dosen not found');
  if (!dosen.password || !(await bcrypt.compare(oldPassword, dosen.password))) throw new ApiError(400, 'Password lama salah');
  if (oldPassword === newPassword) throw new ApiError(400, 'Password baru harus berbeda dari password lama');
  await dosen.update({ password: await bcrypt.hash(newPassword, 10) });
};

module.exports = {
  loginDosen,
  getProfile,
  updatePhoto,
  changePassword,
};
