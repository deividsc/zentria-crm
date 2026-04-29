import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import eventRoutes from '../routes/events';

vi.mock('../db/index.js', () => ({
  getClient: vi.fn(),
}));

vi.mock('../middleware/rateLimit.js', () => ({
  rateLimit: vi.fn(async () => {
    // Allow all requests in tests
  }),
}));

import { getClient } from '../db/index.js';

describe('POST /api/v1/events integration', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    process.env.API_KEY = 'test-api-key';
    mockClient.query.mockClear();
    mockClient.release.mockClear();
    app = Fastify({ logger: false });
    await app.register(eventRoutes, { prefix: '/api/v1' });
  });

  afterEach(async () => {
    await app.close();
  });

  const mockClient = {
    query: vi.fn(),
    release: vi.fn(),
  };

  const validEvent = {
    eventId: '550e8400-e29b-41d4-a716-446655440000',
    eventType: 'page_view',
    eventData: { referrer: 'https://google.com' },
    timestamp: '2024-01-15T10:30:00.000Z',
    pageUrl: 'https://example.com',
    pageTitle: 'Test Page',
    anonymousId: '550e8400-e29b-41d4-a716-446655440001',
    knownId: null,
    sessionId: '550e8400-e29b-41d4-a716-446655440002',
  };

  it('should accept valid events and return 201', async () => {
    vi.mocked(getClient).mockResolvedValue(mockClient as any);
    mockClient.query.mockResolvedValue({ rows: [] });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: {
        'X-API-Key': 'test-api-key',
        'Content-Type': 'application/json',
      },
      payload: {
        apiKey: 'test-api-key',
        events: [validEvent],
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.received).toBe(1);
  });

  it('should reject request with missing API key', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: {
        'Content-Type': 'application/json',
      },
      payload: {
        apiKey: 'test-api-key',
        events: [validEvent],
      },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Missing API key');
  });

  it('should reject request with invalid API key', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: {
        'X-API-Key': 'wrong-key',
        'Content-Type': 'application/json',
      },
      payload: {
        apiKey: 'test-api-key',
        events: [validEvent],
      },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid API key');
  });

  it('should reject invalid payload with 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: {
        'X-API-Key': 'test-api-key',
        'Content-Type': 'application/json',
      },
      payload: {
        apiKey: 'test-api-key',
        events: [
          {
            ...validEvent,
            eventType: 'invalid_type',
          },
        ],
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Invalid payload');
    expect(body.details).toBeDefined();
  });

  it('should handle database errors gracefully', async () => {
    vi.mocked(getClient).mockResolvedValue(mockClient as any);
    mockClient.query.mockRejectedValue(new Error('DB connection lost'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: {
        'X-API-Key': 'test-api-key',
        'Content-Type': 'application/json',
      },
      payload: {
        apiKey: 'test-api-key',
        events: [validEvent],
      },
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Internal server error');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should deduplicate events by event_id via ON CONFLICT', async () => {
    vi.mocked(getClient).mockResolvedValue(mockClient as any);
    mockClient.query.mockResolvedValue({ rows: [] });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: {
        'X-API-Key': 'test-api-key',
        'Content-Type': 'application/json',
      },
      payload: {
        apiKey: 'test-api-key',
        events: [validEvent, validEvent],
      },
    });

    expect(response.statusCode).toBe(201);
    const allInsertCalls = mockClient.query.mock.calls.filter(
      (call: any) => String(call[0]).includes('INSERT INTO')
    );
    // 1 session insert + 2 event inserts (same event twice, ON CONFLICT handles dedup)
    expect(allInsertCalls).toHaveLength(3);
  });
});
