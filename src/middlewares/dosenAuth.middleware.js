const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/jwt');
const { Dosen } = require('../models');

// Mirror pesertaAuth.middleware.js: portal Dosen punya autentikasi sendiri, terpisah
// total dari sistem User/Role/Menu/Permission admin.
const authenticateDosen = catchAsync(async (req, res, next) => {
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

  if (payload.type !== 'dosen') {
    throw new ApiError(401, 'Invalid token for this resource');
  }

  const dosen = await Dosen.findByPk(payload.sub);
  if (!dosen || !dosen.isActive) {
    throw new ApiError(401, 'Dosen is not authorized');
  }

  req.dosen = dosen;
  next();
});

module.exports = authenticateDosen;
