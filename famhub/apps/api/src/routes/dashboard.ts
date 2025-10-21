import { FastifyInstance } from 'fastify';

export async function dashboardRoutes(fastify: FastifyInstance) {
  // Placeholder routes - to be implemented
  fastify.get('/', async (request, reply) => {
    return { message: 'dashboard routes - coming soon' };
  });
}
