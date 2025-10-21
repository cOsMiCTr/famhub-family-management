import { FastifyInstance } from 'fastify';

export async function assetsRoutes(fastify: FastifyInstance) {
  // Placeholder routes - to be implemented
  fastify.get('/', async (request, reply) => {
    return { message: 'assets routes - coming soon' };
  });
}
