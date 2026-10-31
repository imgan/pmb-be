const { ValidationError, UniqueConstraintError } = require('sequelize');
const ApiError = require('../utils/ApiError');

const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  if (err instanceof UniqueConstraintError) {
    statusCode = 409;
    message = err.errors?.map((e) => e.message).join(', ') || 'Duplicate entry';
  } else if (err instanceof ValidationError) {
    statusCode = 400;
    message = err.errors?.map((e) => e.message).join(', ') || 'Validation error';
  } else if (!statusCode) {
    statusCode = 500;
    message = message || 'Internal server error';
  }

  if (process.env.NODE_ENV === 'development') {
    console.error(err);
  }

  // Stack trace hanya untuk debugging lokal: mode development, error server (5xx), dan request dari localhost —
  // server yang berjalan tanpa NODE_ENV=production pun tidak membocorkan path/struktur kode ke publik.
  const lokal = ['localhost', '127.0.0.1', '::1'].includes(req.hostname);
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && statusCode >= 500 && lokal && { stack: err.stack }),
  });
};

module.exports = { notFoundHandler, errorHandler };
