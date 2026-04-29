import { FastifyRequest, FastifyReply } from 'fastify';
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 100;

export async function rateLimit(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const apiKey = request.headers['x-api-key'] as string | undefined;

  if (!apiKey) {
    return reply.status(401).send({ error: 'Missing API key' });
  }

  const key = `ratelimit:${apiKey}`;
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  try {
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zcard(key);
    pipeline.zadd(key, now, `${now}-${Math.random().toString(36).slice(2)}`);
    pipeline.pexpire(key, WINDOW_MS);

    const results = await pipeline.exec();
    if (!results) {
      throw new Error('Redis pipeline returned null');
    }

    const countResult = results[1];
    const count = (countResult && !countResult[0] ? countResult[1] : 0) as number;

    if (count >= MAX_REQUESTS) {
      await redis.zremrangebyrank(key, -1, -1);
      return reply.status(429).send({ error: 'Rate limit exceeded' });
    }
  } catch (err) {
    console.error('Rate limiter error:', err);
    return reply.status(500).send({ error: 'Rate limiter unavailable' });
  }
}
