const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/jwt');
const { User, Role } = require('../models');

const authenticate = catchAsync(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authentication token is missing');
  }

  const token = header.split(' ')[1];
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired token');
  }

  // Token portal (mahasiswa/dosen/peserta) bertanda `type` dan sub-nya id tabel lain — jangan sampai
  // dianggap user staf dengan id yang sama. Token staf tidak punya `type`.
  if (payload.type) {
    throw new ApiError(401, 'Token ini bukan token staf');
  }

  const user = await User.findByPk(payload.sub, { include: [{ model: Role, as: 'role' }] });
  if (!user || !user.isActive) {
    throw new ApiError(401, 'User is not authorized');
  }

  req.user = user;
  next();
});

module.exports = authenticate;
