const catchAsync = require('../utils/catchAsync');
const { verifyAccessToken } = require('../utils/jwt');
const { User, Role } = require('../models');
const { resolveProdiJurusanIds } = require('../services/academicContext.service');

/**
 * Dipasang di depan semua route /prodi/*. Membatasi data per prodi lewat `req.query.jurusanId`
 * (array id jurusan → Sequelize IN) yang dipakai service-service prodi:
 * - akun ber-role PRODI selalu dipaksa ke prodinya sendiri (mengabaikan filter dari klien);
 * - role lain memakai prodi yang dipilih saat login (header X-Kode-Prodi) bila halaman tidak
 *   mengirim filter prodi sendiri; tanpa header = semua prodi.
 * Token tidak valid/kosong dibiarkan lewat — middleware `authenticate` di tiap route yang menolak.
 */
const prodiScope = catchAsync(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();

  let payload;
  try {
    payload = verifyAccessToken(header.split(' ')[1]);
  } catch {
    return next();
  }
  if (payload.type) return next(); // token portal, bukan staf — ditolak oleh authenticate
  const user = await User.findByPk(payload.sub, { include: [{ model: Role, as: 'role' }] });
  if (!user) return next();

  const scoped = user.role?.code === 'PRODI';
  if (!scoped && req.query.jurusanId) return next();

  const jurusanIds = await resolveProdiJurusanIds(user, req.headers['x-kode-prodi']);
  if (jurusanIds) req.query.jurusanId = jurusanIds;
  next();
});

module.exports = prodiScope;
