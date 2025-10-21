import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import staticFiles from '@fastify/static';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { PrismaClient } from '@prisma/client';
import { config } from './config';
import { authRoutes } from './routes/auth';
import { familyRoutes } from './routes/families';
import { memberRoutes } from './routes/members';
import { providerRoutes } from './routes/providers';
import { contractRoutes } from './routes/contracts';
import { fixedCostRoutes } from './routes/fixed-costs';
import { assetRoutes } from './routes/assets';
import { loanRoutes } from './routes/loans';
import { reminderRoutes } from './routes/reminders';
import { attachmentRoutes } from './routes/attachments';
import { dashboardRoutes } from './routes/dashboard';
import { importRoutes } from './routes/imports';
import { calendarRoutes } from './routes/calendar';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import { auditLogger } from './middleware/audit-logger';

// Initialize Prisma
export const prisma = new PrismaClient();

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  },
}).withTypeProvider<TypeBoxTypeProvider>();

// Register plugins
await fastify.register(cors, {
  origin: config.WEB_ORIGIN,
  credentials: true,
});

await fastify.register(helmet, {
  contentSecurityPolicy: false, // Disable for development
});

await fastify.register(staticFiles, {
  root: config.UPLOAD_DIR,
  prefix: '/uploads/',
});

await fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Register middleware
fastify.addHook('onRequest', authMiddleware);
fastify.setErrorHandler(errorHandler);
fastify.addHook('onSend', auditLogger);

// Register routes
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(familyRoutes, { prefix: '/api/families' });
await fastify.register(memberRoutes, { prefix: '/api/members' });
await fastify.register(providerRoutes, { prefix: '/api/providers' });
await fastify.register(contractRoutes, { prefix: '/api/contracts' });
await fastify.register(fixedCostRoutes, { prefix: '/api/fixed-costs' });
await fastify.register(assetRoutes, { prefix: '/api/assets' });
await fastify.register(loanRoutes, { prefix: '/api/loans' });
await fastify.register(reminderRoutes, { prefix: '/api/reminders' });
await fastify.register(attachmentRoutes, { prefix: '/api/attachments' });
await fastify.register(dashboardRoutes, { prefix: '/api/dashboard' });
await fastify.register(importRoutes, { prefix: '/api/imports' });
await fastify.register(calendarRoutes, { prefix: '/api/calendar' });

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Start server
const start = async () => {
  try {
    const address = await fastify.listen({
      port: config.PORT,
      host: '0.0.0.0',
    });
    console.log(`🚀 Server listening at ${address}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down server...');
  await fastify.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down server...');
  await fastify.close();
  await prisma.$disconnect();
  process.exit(0);
});

start();
