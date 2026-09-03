import logger from '../utils/logger.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const errorHandler = (err, req, res, _next) => {
  logger.error(err.message, { stack: err.stack, path: req.path });

  if (err.name === 'SequelizeUniqueConstraintError') {
    return ApiResponse.badRequest(res, 'Duplicate entry', err.errors?.map(e => e.message));
  }
  if (err.name === 'SequelizeValidationError') {
    return ApiResponse.badRequest(res, 'Validation error', err.errors?.map(e => e.message));
  }

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal server error'
    : err.message;

  return ApiResponse.error(res, message, statusCode);
};
