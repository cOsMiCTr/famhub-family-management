import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../index';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    familyId: string;
    role: string;
  };
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Skip auth for public routes
  const publicRoutes = [
    '/health',
    '/api/auth/signup',
    '/api/auth/login',
    '/api/calendar.ics',
  ];

  if (publicRoutes.some(route => request.url.startsWith(route))) {
    return;
  }

  // Skip auth for OPTIONS requests
  if (request.method === 'OPTIONS') {
    return;
  }

  const token = request.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return reply.status(401).send({
      code: 'UNAUTHORIZED',
      message: 'No token provided',
    });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    
    // Verify user still exists and get fresh data
    const user = await prisma.member.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        familyId: true,
        role: true,
      },
    });

    if (!user) {
      return reply.status(401).send({
        code: 'UNAUTHORIZED',
        message: 'User not found',
      });
    }

    // Attach user to request
    (request as AuthenticatedRequest).user = user;
  } catch (error) {
    return reply.status(401).send({
      code: 'UNAUTHORIZED',
      message: 'Invalid token',
    });
  }
}
