import { FastifyInstance } from 'fastify';

export async function membersRoutes(fastify: FastifyInstance) {
  // Placeholder routes - to be implemented
  fastify.get('/', async (request, reply) => {
    return { message: 'members routes - coming soon' };
  });
}
