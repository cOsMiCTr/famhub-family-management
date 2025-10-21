import { FastifyInstance } from 'fastify';

export async function loansRoutes(fastify: FastifyInstance) {
  // Placeholder routes - to be implemented
  fastify.get('/', async (request, reply) => {
    return { message: 'loans routes - coming soon' };
  });
}
