import { FastifyInstance } from 'fastify';

export async function attachmentsRoutes(fastify: FastifyInstance) {
  // Placeholder routes - to be implemented
  fastify.get('/', async (request, reply) => {
    return { message: 'attachments routes - coming soon' };
  });
}
