import { FastifyInstance } from 'fastify';

export async function importsRoutes(fastify: FastifyInstance) {
  // Placeholder routes - to be implemented
  fastify.get('/', async (request, reply) => {
    return { message: 'imports routes - coming soon' };
  });
}
