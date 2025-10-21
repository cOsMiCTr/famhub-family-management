import { FastifyInstance } from 'fastify';

export async function fixed_costsRoutes(fastify: FastifyInstance) {
  // Placeholder routes - to be implemented
  fastify.get('/', async (request, reply) => {
    return { message: 'fixed-costs routes - coming soon' };
  });
}
