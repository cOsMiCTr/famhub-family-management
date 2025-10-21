import { FastifyInstance } from 'fastify';

export async function providersRoutes(fastify: FastifyInstance) {
  // Placeholder routes - to be implemented
  fastify.get('/', async (request, reply) => {
    return { message: 'providers routes - coming soon' };
  });
}
