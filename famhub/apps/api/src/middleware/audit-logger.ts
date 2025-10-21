import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../index';
import { AuthenticatedRequest } from './auth';

export async function auditLogger(
  request: FastifyRequest,
  reply: FastifyReply,
  payload: any
) {
  // Only log mutations (POST, PUT, PATCH, DELETE)
  const mutationMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!mutationMethods.includes(request.method)) {
    return payload;
  }

  // Skip audit for certain routes
  const skipRoutes = [
    '/api/auth/login',
    '/api/auth/signup',
    '/health',
  ];

  if (skipRoutes.some(route => request.url.startsWith(route))) {
    return payload;
  }

  // Only log if user is authenticated
  const user = (request as AuthenticatedRequest).user;
  if (!user) {
    return payload;
  }

  try {
    // Extract target information from URL
    const urlParts = request.url.split('/');
    const targetType = urlParts[2]?.replace('-', '_'); // e.g., 'contracts' -> 'contracts'
    const targetId = urlParts[3]; // e.g., '123' from '/api/contracts/123'

    // Determine action from method
    let action = request.method;
    if (request.method === 'POST') {
      action = 'CREATE';
    } else if (request.method === 'PUT' || request.method === 'PATCH') {
      action = 'UPDATE';
    } else if (request.method === 'DELETE') {
      action = 'DELETE';
    }

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        familyId: user.familyId,
        actorId: user.id,
        action,
        targetType: targetType || 'unknown',
        targetId: targetId || null,
        before: request.body || null,
        after: reply.statusCode < 400 ? payload : null,
      },
    });
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error('Audit logging failed:', error);
  }

  return payload;
}
