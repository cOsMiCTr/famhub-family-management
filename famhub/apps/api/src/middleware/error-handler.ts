import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log error
  request.log.error(error);

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return reply.status(409).send({
          code: 'CONFLICT',
          message: 'A record with this information already exists',
          details: error.meta,
        });
      case 'P2025':
        return reply.status(404).send({
          code: 'NOT_FOUND',
          message: 'Record not found',
        });
      case 'P2003':
        return reply.status(400).send({
          code: 'FOREIGN_KEY_CONSTRAINT',
          message: 'Invalid reference to related record',
        });
      default:
        return reply.status(400).send({
          code: 'DATABASE_ERROR',
          message: 'Database operation failed',
          details: error.meta,
        });
    }
  }

  // Handle validation errors
  if (error.validation) {
    return reply.status(400).send({
      code: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details: error.validation,
    });
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return reply.status(401).send({
      code: 'INVALID_TOKEN',
      message: 'Invalid authentication token',
    });
  }

  if (error.name === 'TokenExpiredError') {
    return reply.status(401).send({
      code: 'TOKEN_EXPIRED',
      message: 'Authentication token has expired',
    });
  }

  // Handle rate limit errors
  if (error.statusCode === 429) {
    return reply.status(429).send({
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests',
    });
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  return reply.status(statusCode).send({
    code: 'INTERNAL_ERROR',
    message: statusCode === 500 ? 'Internal server error' : message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
}
