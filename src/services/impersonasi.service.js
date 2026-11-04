const { Op } = require('sequelize');
const { User, Role, Dosen, Mahasiswa, Jurusan } = require('../models');
const ApiError = require('../utils/ApiError');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const { getPagination, getPagingMeta } = require('../utils/pagination');
const { resolveLoginContext, isProdiScoped } = require('./academicContext.service');

/**
 * Impersonasi (Superadmin "masuk sebagai" akun lain) untuk 3 jenis akun:
 * - staff     : akun console staff (tabel users — karyawan BAAK/Keuangan/Prodi/dst.)
 * - dosen     : portal dosen
 * - mahasiswa : portal mahasiswa
 * Token yang diterbitkan sama dengan token login biasa akun tsb, ditambah `impersonatedBy`
 * (id admin) supaya jejaknya bisa ditelusuri. Setiap impersonasi tercatat di audit log.
 */

const like = (search) => ({ [Op.like]: `%${search}%` });

const listStaff = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) where[Op.or] = [{ name: like(query.search) }, { username: like(query.search) }, { email: like(query.search) }];
  const { rows, count } = await User.findAndCountAll({
    where,
    include: [{ model: Role, as: 'role', attributes: ['id', 'code', 'name'] }],
    attributes: ['id', 'name', 'username', 'email', 'kodeProdi', 'isActive', 'lastLoginAt'],
    order: [['name', 'ASC']],
    limit,
    offset,
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const listDosen = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) where[Op.or] = [{ namaLengkap: like(query.search) }, { nik: like(query.search) }, { nidn: like(query.search) }, { email: like(query.search) }];
  const { rows, count } = await Dosen.findAndCountAll({
    where,
    attributes: ['id', 'nik', 'nidn', 'namaLengkap', 'gelar', 'email', 'isActive', 'lastLoginAt'],
    order: [['namaLengkap', 'ASC']],
    limit,
    offset,
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const listMahasiswa = async (query) => {
  const { page, limit, offset } = getPagination(query);
  const where = {};
  if (query.search) where[Op.or] = [{ namaLengkap: like(query.search) }, { nim: like(query.search) }, { email: like(query.search) }];
  const { rows, count } = await Mahasiswa.findAndCountAll({
    where,
    include: [{ model: Jurusan, as: 'jurusan', attributes: ['id', 'namaJurusan'] }],
    attributes: ['id', 'nim', 'namaLengkap', 'email', 'tahunMasuk', 'isActive', 'lastLoginAt'],
    order: [['nim', 'ASC']],
    limit,
    offset,
  });
  return { data: rows, meta: getPagingMeta(count, page, limit) };
};

const impersonateStaff = async (id, admin) => {
  if (Number(id) === admin.id) throw new ApiError(400, 'Tidak bisa impersonasi akun sendiri');
  const user = await User.scope('withPhoto').findByPk(id, { include: [{ model: Role, as: 'role' }] });
  if (!user) throw new ApiError(404, 'Akun staff tidak ditemukan');
  if (!user.isActive) throw new ApiError(400, 'Akun staff tidak aktif');

  // Akun Prodi langsung dibuka di prodinya sendiri; akun lain tanpa konteks prodi.
  let context = { tahunAkademik: null, prodi: null };
  if (isProdiScoped(user) && user.kodeProdi) {
    context = await resolveLoginContext(user, { module: 'prodi', kodeProdi: user.kodeProdi }).catch(() => context);
  }

  return {
    user,
    accessToken: generateAccessToken({ sub: user.id, roleId: user.roleId, roleCode: user.role?.code, impersonatedBy: admin.id }),
    refreshToken: generateRefreshToken({ sub: user.id, impersonatedBy: admin.id }),
    context,
  };
};

const impersonateDosen = async (id, admin) => {
  const dosen = await Dosen.findByPk(id);
  if (!dosen) throw new ApiError(404, 'Dosen tidak ditemukan');
  if (!dosen.isActive) throw new ApiError(400, 'Akun dosen tidak aktif');
  return { dosen, accessToken: generateAccessToken({ sub: dosen.id, type: 'dosen', impersonatedBy: admin.id }) };
};

const impersonateMahasiswa = async (id, admin) => {
  const mahasiswa = await Mahasiswa.findByPk(id);
  if (!mahasiswa) throw new ApiError(404, 'Mahasiswa tidak ditemukan');
  if (!mahasiswa.isActive) throw new ApiError(400, 'Akun mahasiswa tidak aktif');
  return { mahasiswa, accessToken: generateAccessToken({ sub: mahasiswa.id, type: 'mahasiswa', impersonatedBy: admin.id }) };
};

module.exports = { listStaff, listDosen, listMahasiswa, impersonateStaff, impersonateDosen, impersonateMahasiswa };
