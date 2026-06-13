import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { HTTP_STATUS } from '../utils/constants';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const correlationId = req.context?.correlationId || 'unknown';

  logger.error('Unhandled error', {
    error: err.message,
    code: err.code,
    stack: err.stack,
    correlationId,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : err.message,
    code: err.code,
    correlationId,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack, details: err.details }),
  });
}

export default errorHandler;
