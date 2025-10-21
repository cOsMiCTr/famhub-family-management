import { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { prisma } from '../index';

export async function familyRoutes(fastify: FastifyInstance) {
  // Get families (for the authenticated user)
  fastify.get('/', async (request, reply) => {
    const user = (request as any).user;
    
    const families = await prisma.family.findMany({
      where: {
        members: {
          some: {
            id: user.id,
          },
        },
      },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            contracts: true,
            fixedCosts: true,
            assets: true,
            loans: true,
          },
        },
      },
    });

    return families;
  });

  // Get family by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as any;
    const user = (request as any).user;

    const family = await prisma.family.findFirst({
      where: {
        id,
        members: {
          some: {
            id: user.id,
          },
        },
      },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });

    if (!family) {
      return reply.status(404).send({
        code: 'NOT_FOUND',
        message: 'Family not found',
      });
    }

    return family;
  });
}
