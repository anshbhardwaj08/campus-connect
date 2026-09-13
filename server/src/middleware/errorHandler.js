const ApiError = require('../utils/ApiError');
const { winstonLogger } = require('./logger');

const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
    const message = error.message || 'Internal server error';
    error = new ApiError(statusCode, message, error.errors || [], err.stack);
  }

  winstonLogger.error(`${req.method} ${req.originalUrl} - ${error.message}`, {
    stack: error.stack,
  });

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    errors: error.errors,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  });
};

module.exports = errorHandler;
