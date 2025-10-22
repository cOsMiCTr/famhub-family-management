"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createForbiddenError = exports.createUnauthorizedError = exports.createNotFoundError = exports.createValidationError = exports.asyncHandler = exports.errorHandler = exports.CustomError = void 0;
class CustomError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.CustomError = CustomError;
const errorHandler = (error, req, res, next) => {
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal Server Error';
    let code = error.code || 'INTERNAL_ERROR';
    if (error.name === 'ValidationError') {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
    }
    else if (error.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid data format';
        code = 'INVALID_FORMAT';
    }
    else if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
        code = 'INVALID_TOKEN';
    }
    else if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
        code = 'TOKEN_EXPIRED';
    }
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
    }
    else {
        console.warn('Client Error:', {
            message: error.message,
            code: error.code,
            url: req.url,
            method: req.method,
            ip: req.ip,
            timestamp: new Date().toISOString()
        });
    }
    res.status(statusCode).json({
        error: message,
        code: code,
        ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack,
            details: error
        })
    });
};
exports.errorHandler = errorHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
const createValidationError = (message, field) => {
    const error = new CustomError(message, 400, 'VALIDATION_ERROR');
    if (field) {
        error.field = field;
    }
    return error;
};
exports.createValidationError = createValidationError;
const createNotFoundError = (resource) => {
    return new CustomError(`${resource} not found`, 404, 'NOT_FOUND');
};
exports.createNotFoundError = createNotFoundError;
const createUnauthorizedError = (message = 'Unauthorized') => {
    return new CustomError(message, 401, 'UNAUTHORIZED');
};
exports.createUnauthorizedError = createUnauthorizedError;
const createForbiddenError = (message = 'Access denied') => {
    return new CustomError(message, 403, 'FORBIDDEN');
};
exports.createForbiddenError = createForbiddenError;
//# sourceMappingURL=errorHandler.js.map