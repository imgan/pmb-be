const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/jwt');
const { Mahasiswa } = require('../models');

// Mirror dosenAuth.middleware.js / pesertaAuth.middleware.js: portal Mahasiswa punya
// autentikasi sendiri, terpisah total dari sistem User/Role/Menu/Permission admin.
const authenticateMahasiswa = catchAsync(async (req, res, next) => {
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

  if (payload.type !== 'mahasiswa') {
    throw new ApiError(401, 'Invalid token for this resource');
  }

  const mahasiswa = await Mahasiswa.findByPk(payload.sub);
  if (!mahasiswa || !mahasiswa.isActive) {
    throw new ApiError(401, 'Mahasiswa is not authorized');
  }

  req.mahasiswa = mahasiswa;
  next();
});

module.exports = authenticateMahasiswa;
