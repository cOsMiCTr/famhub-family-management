import { FastifyInstance } from 'fastify';

export async function remindersRoutes(fastify: FastifyInstance) {
  // Placeholder routes - to be implemented
  fastify.get('/', async (request, reply) => {
    return { message: 'reminders routes - coming soon' };
  });
}
