const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/jwt');
const { Peserta } = require('../models');

const authenticatePeserta = catchAsync(async (req, res, next) => {
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

  if (payload.type !== 'peserta') {
    throw new ApiError(401, 'Invalid token for this resource');
  }

  const peserta = await Peserta.findByPk(payload.sub);
  if (!peserta || !peserta.isActive) {
    throw new ApiError(401, 'Peserta is not authorized');
  }

  req.peserta = peserta;
  next();
});

module.exports = authenticatePeserta;
