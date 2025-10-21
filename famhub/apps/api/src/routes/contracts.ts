import { FastifyInstance } from 'fastify';

export async function contractsRoutes(fastify: FastifyInstance) {
  // Placeholder routes - to be implemented
  fastify.get('/', async (request, reply) => {
    return { message: 'contracts routes - coming soon' };
  });
}
