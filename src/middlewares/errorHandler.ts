import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err);

  const statusCode = err.statusCode || 500;
  const message = config.env === 'production' && statusCode === 500
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(config.env === 'development' && { stack: err.stack })
  });
};
