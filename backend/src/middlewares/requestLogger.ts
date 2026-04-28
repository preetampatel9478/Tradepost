import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // Capture the original send function
  const originalSend = res.send;

  // Override send to log response
  res.send = function(data) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    logger.info(`${req.method} ${req.path}`, {
      statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: (req as any).userId
    });

    // Call the original send function
    return originalSend.call(this, data);
  };

  next();
}
