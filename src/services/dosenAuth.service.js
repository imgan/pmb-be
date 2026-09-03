const bcrypt = require('bcryptjs');
const { Dosen } = require('../models');
const ApiError = require('../utils/ApiError');
const { generateAccessToken } = require('../utils/jwt');

const loginDosen = async ({ nidn, email, password }) => {
  const where = nidn ? { nidn } : { email };
  const dosen = await Dosen.scope('withPassword').findOne({ where });
  if (!dosen || !dosen.password) throw new ApiError(401, 'NIDN/email atau password salah');
  if (!dosen.isActive) throw new ApiError(403, 'Akun dosen tidak aktif');

  const isMatch = await bcrypt.compare(password, dosen.password);
  if (!isMatch) throw new ApiError(401, 'NIDN/email atau password salah');

  const accessToken = generateAccessToken({ sub: dosen.id, type: 'dosen' });
  return { dosen: await Dosen.findByPk(dosen.id), accessToken };
};

const getProfile = async (dosenId) => {
  const dosen = await Dosen.findByPk(dosenId);
  if (!dosen) throw new ApiError(404, 'Dosen not found');
  return dosen;
};

module.exports = {
  loginDosen,
  getProfile,
};
