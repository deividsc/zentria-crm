import Fastify from 'fastify';
import cors from '@fastify/cors';
import eventRoutes from './routes/events.js';

const fastify = Fastify({
  logger: true,
});

async function start(): Promise<void> {
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  await fastify.register(eventRoutes, { prefix: '/api/v1' });

  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';

  try {
    await fastify.listen({ port, host });
    console.log(`Server listening on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
