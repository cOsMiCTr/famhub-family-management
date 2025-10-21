import { FastifyInstance } from 'fastify';

export async function calendarRoutes(fastify: FastifyInstance) {
  // Placeholder routes - to be implemented
  fastify.get('/', async (request, reply) => {
    return { message: 'calendar routes - coming soon' };
  });
}
