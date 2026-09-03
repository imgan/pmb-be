const bcrypt = require('bcryptjs');
const { Mahasiswa, GolonganKelas, Jurusan, MahasiswaBiodata } = require('../models');
const ApiError = require('../utils/ApiError');
const { generateAccessToken } = require('../utils/jwt');

const loginMahasiswa = async ({ nim, email, password }) => {
  const where = nim ? { nim } : { email };
  const mahasiswa = await Mahasiswa.scope('withPassword').findOne({ where });
  if (!mahasiswa || !mahasiswa.password) throw new ApiError(401, 'NIM/email atau password salah');
  if (!mahasiswa.isActive) throw new ApiError(403, 'Akun mahasiswa tidak aktif');

  const isMatch = await bcrypt.compare(password, mahasiswa.password);
  if (!isMatch) throw new ApiError(401, 'NIM/email atau password salah');

  const accessToken = generateAccessToken({ sub: mahasiswa.id, type: 'mahasiswa' });
  return { mahasiswa: await Mahasiswa.findByPk(mahasiswa.id), accessToken };
};

const getProfile = async (mahasiswaId) => {
  const mahasiswa = await Mahasiswa.scope('withPhoto').findByPk(mahasiswaId, {
    include: [
      { model: GolonganKelas, as: 'golonganKelas' },
      { model: Jurusan, as: 'jurusan' },
      { model: MahasiswaBiodata, as: 'biodata' },
    ],
  });
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa not found');
  return mahasiswa;
};

const updateProfile = async (mahasiswaId, payload) => {
  const mahasiswa = await Mahasiswa.findByPk(mahasiswaId);
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa not found');

  await mahasiswa.update(payload);
  return getProfile(mahasiswaId);
};

const changePassword = async (mahasiswaId, oldPassword, newPassword) => {
  const mahasiswa = await Mahasiswa.scope('withPassword').findByPk(mahasiswaId);
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa not found');

  const isMatch = await bcrypt.compare(oldPassword, mahasiswa.password);
  if (!isMatch) throw new ApiError(400, 'Password lama salah');

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await mahasiswa.update({ password: hashedPassword });
};

module.exports = {
  loginMahasiswa,
  getProfile,
  updateProfile,
  changePassword,
};
