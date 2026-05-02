import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import multer from 'multer';

interface ApiError extends Error {
  statusCode?: number;
  details?: any;
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err instanceof multer.MulterError) {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') message = 'Profile photo is too large (max 5MB)';
    else message = err.message || 'Upload failed';
  }

  // Mongoose validation errors
  const anyErr = err as any;
  if (anyErr?.name === 'ValidationError') {
    statusCode = 400;
    const fieldMessages = anyErr?.errors ? Object.values(anyErr.errors).map((e: any) => e?.message).filter(Boolean) : [];
    message = fieldMessages.length ? fieldMessages.join(', ') : 'Invalid input';
  }

  logger.error(`[${statusCode}] ${message}`, {
    path: req.path,
    method: req.method,
    stack: err.stack,
    details: err.details
  });

  res.status(statusCode).json({
    success: false,
    message,
    statusCode,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

export function createError(
  statusCode: number,
  message: string,
  details?: any
): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.details = details;
  return error;
}
