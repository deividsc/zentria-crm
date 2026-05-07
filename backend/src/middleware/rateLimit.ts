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

const IDENTITY_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_IDENTITY_PER_IP = 5;

async function slidingWindowCheck(
  key: string,
  windowMs: number,
  maxRequests: number,
): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - windowMs;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);
  pipeline.zcard(key);
  pipeline.zadd(key, now, `${now}-${Math.random().toString(36).slice(2)}`);
  pipeline.pexpire(key, windowMs);

  const results = await pipeline.exec();
  if (!results) throw new Error('Redis pipeline returned null');

  const countResult = results[1];
  const count = (countResult && !countResult[0] ? countResult[1] : 0) as number;

  if (count >= maxRequests) {
    await redis.zremrangebyrank(key, -1, -1);
    return false;
  }
  return true;
}

export async function rateLimit(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const apiKey = request.headers['x-api-key'] as string | undefined;

  if (!apiKey) {
    return reply.status(401).send({ error: 'Missing API key' });
  }

  try {
    // Layer A: per API key, 100 req/min (general)
    const keyAllowed = await slidingWindowCheck(`ratelimit:key:${apiKey}`, WINDOW_MS, MAX_REQUESTS);
    if (!keyAllowed) {
      return reply.status(429).send({ error: 'Rate limit exceeded' });
    }

    // Layer B: per IP, 5 identity_linked events/hour — checked in route after parsing body
    // Only trust x-forwarded-for when running behind a reverse proxy (TRUST_PROXY=true)
    const forwardedFor = process.env.TRUST_PROXY === 'true'
      ? (request.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim()
      : undefined;
    (request as FastifyRequest & { clientIp?: string }).clientIp = forwardedFor || request.ip;
  } catch (err) {
    request.log.error({ err }, 'Rate limiter error');
    return reply.status(500).send({ error: 'Rate limiter unavailable' });
  }
}

export async function checkIdentityRateLimit(ip: string): Promise<boolean> {
  try {
    return await slidingWindowCheck(`ratelimit:ip:${ip}:identity`, IDENTITY_WINDOW_MS, MAX_IDENTITY_PER_IP);
  } catch {
    return true; // fail open on Redis errors — don't block legit leads
  }
}
