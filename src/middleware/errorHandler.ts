import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let code = error.code || 'INTERNAL_ERROR';

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid data format';
    code = 'INVALID_FORMAT';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  }

  // Log error for debugging
  if (statusCode >= 500) {
    console.error('Server Error:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  } else {
    console.warn('Client Error:', {
      message: error.message,
      code: error.code,
      url: req.url,
      method: req.method,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
  }

  // Send error response
  res.status(statusCode).json({
    error: message,
    code: code,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error
    })
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation error helper
export const createValidationError = (message: string, field?: string) => {
  const error = new CustomError(message, 400, 'VALIDATION_ERROR');
  if (field) {
    (error as any).field = field;
  }
  return error;
};

// Not found error helper
export const createNotFoundError = (resource: string) => {
  return new CustomError(`${resource} not found`, 404, 'NOT_FOUND');
};

// Unauthorized error helper
export const createUnauthorizedError = (message: string = 'Unauthorized') => {
  return new CustomError(message, 401, 'UNAUTHORIZED');
};

// Forbidden error helper
export const createForbiddenError = (message: string = 'Access denied') => {
  return new CustomError(message, 403, 'FORBIDDEN');
};
