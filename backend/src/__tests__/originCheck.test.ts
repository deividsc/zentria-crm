import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';

vi.mock('../db/index.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}));

vi.mock('../middleware/rateLimit.js', () => ({
  rateLimit: vi.fn(async () => {}),
  checkIdentityRateLimit: vi.fn(async () => true),
}));

import { query } from '../db/index.js';
import { originCheck } from '../middleware/originCheck.js';

function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.post('/test', { preHandler: [originCheck] }, async (_req, reply) => {
    return reply.status(200).send({ ok: true });
  });
  return app;
}

describe('originCheck middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the internal cache between tests by resetting the module mock
  });

  it('passes through OPTIONS requests (preflight)', async () => {
    const app = buildApp();
    const response = await app.inject({ method: 'OPTIONS', url: '/test' });
    // OPTIONS may 404 since we only register POST, but it must NOT hit originCheck logic
    expect(response.statusCode).not.toBe(403);
    await app.close();
  });

  it('returns 403 when Origin header is missing', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [{ allowed_origins: ['http://localhost:8082'] }] } as any);

    const app = buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/test',
      headers: { 'x-api-key': 'zt_live_dev', 'content-type': 'application/json' },
      payload: {},
    });

    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.body).error).toBe('Origin header required');
    await app.close();
  });

  it('returns 401 when API key is not in the database', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as any);

    const app = buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/test',
      headers: {
        'x-api-key': 'unknown-key',
        'origin': 'http://localhost:8082',
        'content-type': 'application/json',
      },
      payload: {},
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body).error).toBe('Invalid API key');
    await app.close();
  });

  it('returns 403 when origin is not in the whitelist', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [{ allowed_origins: ['http://localhost:8082'] }] } as any);

    const app = buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/test',
      headers: {
        'x-api-key': 'zt_live_dev',
        'origin': 'https://evil.com',
        'content-type': 'application/json',
      },
      payload: {},
    });

    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.body).error).toBe('Origin not allowed');
    await app.close();
  });

  it('returns 200 when origin is in the whitelist', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [{ allowed_origins: ['http://localhost:8082'] }] } as any);

    const app = buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/test',
      headers: {
        'x-api-key': 'zt_live_dev',
        'origin': 'http://localhost:8082',
        'content-type': 'application/json',
      },
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it('normalizes trailing slash in origin before comparison', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [{ allowed_origins: ['http://localhost:8082'] }] } as any);

    const app = buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/test',
      headers: {
        'x-api-key': 'zt_live_dev',
        'origin': 'http://localhost:8082/',
        'content-type': 'application/json',
      },
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it('returns 500 on DB error and does not expose internal detail', async () => {
    vi.mocked(query).mockRejectedValue(new Error('connection timeout'));

    const app = buildApp();
    // Use a unique key so the internal cache has no prior entry for it
    const response = await app.inject({
      method: 'POST',
      url: '/test',
      headers: {
        'x-api-key': 'zt_key_db_error_test',
        'origin': 'http://localhost:8082',
        'content-type': 'application/json',
      },
      payload: {},
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Internal server error');
    expect(body.error).not.toContain('connection timeout');
    await app.close();
  });

  it('skips originCheck logic when x-api-key header is absent', async () => {
    // rateLimit would reject this, but originCheck itself should not call query
    const app = buildApp();
    await app.inject({
      method: 'POST',
      url: '/test',
      headers: { 'origin': 'http://localhost:8082', 'content-type': 'application/json' },
      payload: {},
    });

    expect(vi.mocked(query)).not.toHaveBeenCalled();
    await app.close();
  });
});
