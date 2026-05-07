import { FastifyRequest, FastifyReply } from 'fastify';
import { query } from '../db/index.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_SIZE = 1000;

const cache = new Map<string, { origins: Set<string>; expiresAt: number }>();

async function getAllowedOrigins(apiKey: string): Promise<Set<string> | null> {
  const now = Date.now();
  const cached = cache.get(apiKey);
  if (cached && cached.expiresAt > now) return cached.origins;

  const result = await query<{ allowed_origins: string[] }>(
    'SELECT allowed_origins FROM api_keys WHERE key = $1 LIMIT 1',
    [apiKey]
  );

  if (result.rows.length === 0) return null;

  const origins = new Set(result.rows[0].allowed_origins);

  if (cache.size >= CACHE_MAX_SIZE) {
    cache.delete(cache.keys().next().value as string);
  }
  cache.set(apiKey, { origins, expiresAt: now + CACHE_TTL_MS });
  return origins;
}

export async function originCheck(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // Skip preflight — CORS middleware handles OPTIONS
  if (request.method === 'OPTIONS') return;

  const apiKey = request.headers['x-api-key'] as string | undefined;
  if (!apiKey) return; // rateLimit middleware will reject this before we get here

  const origin = request.headers['origin'] as string | undefined;
  if (!origin) {
    return reply.status(403).send({ error: 'Origin header required' });
  }

  try {
    const allowed = await getAllowedOrigins(apiKey);

    if (allowed === null) {
      return reply.status(401).send({ error: 'Invalid API key' });
    }

    // Normalize: strip trailing slash for comparison
    const normalizedOrigin = origin.replace(/\/$/, '');
    if (!allowed.has(normalizedOrigin)) {
      return reply.status(403).send({ error: 'Origin not allowed' });
    }
  } catch (err) {
    request.log.error({ err }, 'originCheck DB error');
    return reply.status(500).send({ error: 'Internal server error' });
  }
}
