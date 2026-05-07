import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import eventRoutes from '../routes/events.js';

vi.mock('../db/index.js', () => ({
  getClient: vi.fn(),
  query: vi.fn(),
}));

vi.mock('../middleware/rateLimit.js', () => ({
  rateLimit: vi.fn(async (request: any) => {
    // Simulate rateLimit storing clientIp (mirrors real behavior)
    (request as any).clientIp =
      (request.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() ||
      request.ip;
  }),
  checkIdentityRateLimit: vi.fn(async () => true),
}));

vi.mock('../middleware/originCheck.js', () => ({
  originCheck: vi.fn(async () => {}),
}));

import { getClient, query } from '../db/index.js';
import { checkIdentityRateLimit } from '../middleware/rateLimit.js';

const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};

const baseEvent = {
  eventId: '550e8400-e29b-41d4-a716-446655440000',
  eventType: 'page_view' as const,
  eventData: { referrer: '' },
  timestamp: '2024-01-15T10:30:00.000Z',
  pageUrl: 'https://example.com',
  pageTitle: 'Test',
  anonymousId: '550e8400-e29b-41d4-a716-446655440001',
  knownId: null,
  sessionId: '550e8400-e29b-41d4-a716-446655440002',
};

function buildApp() {
  const app = Fastify({ logger: false });
  app.register(eventRoutes, { prefix: '/api/v1' });
  return app;
}

describe('Security: behavioral scoring (Layer 2)', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getClient).mockResolvedValue(mockClient as any);
    mockClient.query.mockResolvedValue({ rows: [] });
    app = buildApp();
  });

  afterEach(() => app.close());

  it('stores risk_score=0 and risk_flags=[] for a clean form_submit', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: { 'x-api-key': 'zt_live_dev', 'content-type': 'application/json' },
      payload: {
        apiKey: 'zt_live_dev',
        events: [{
          ...baseEvent,
          eventId: '550e8400-e29b-41d4-a716-000000000010',
          eventType: 'form_submit',
          eventData: {
            formId: 'contact',
            durationMs: 5000,
            behavioral_signals: {
              durationMs: 5000,
              hadMouseMove: true,
              hadKeydown: true,
              tabVisible: true,
            },
          },
        }],
      },
    });

    expect(response.statusCode).toBe(201);

    const insertCall = mockClient.query.mock.calls.find(
      (call: any[]) => String(call[0]).includes('INSERT INTO events')
    );
    expect(insertCall).toBeDefined();
    const params = insertCall![1];
    const riskScore = params[9];
    const riskFlags = params[10];
    expect(riskScore).toBe(0);
    expect(riskFlags).toEqual([]);
  });

  it('assigns risk_score=1 for fast_submit (durationMs < 2000)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: { 'x-api-key': 'zt_live_dev', 'content-type': 'application/json' },
      payload: {
        apiKey: 'zt_live_dev',
        events: [{
          ...baseEvent,
          eventId: '550e8400-e29b-41d4-a716-000000000020',
          eventType: 'form_submit',
          eventData: {
            formId: 'contact',
            durationMs: 800,
            behavioral_signals: {
              durationMs: 800,
              hadMouseMove: true,
              hadKeydown: true,
              tabVisible: true,
            },
          },
        }],
      },
    });

    expect(response.statusCode).toBe(201);
    const insertCall = mockClient.query.mock.calls.find(
      (call: any[]) => String(call[0]).includes('INSERT INTO events')
    );
    const params = insertCall![1];
    expect(params[9]).toBe(1);
    expect(params[10]).toContain('fast_submit');
  });

  it('assigns risk_score=4 for all bot signals combined', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: { 'x-api-key': 'zt_live_dev', 'content-type': 'application/json' },
      payload: {
        apiKey: 'zt_live_dev',
        events: [{
          ...baseEvent,
          eventId: '550e8400-e29b-41d4-a716-000000000030',
          eventType: 'form_submit',
          eventData: {
            formId: 'contact',
            durationMs: 500,
            behavioral_signals: {
              durationMs: 500,       // +1 fast_submit
              hadMouseMove: false,   // +1 no_mouse_move
              hadKeydown: false,     // +1 no_keydown
              tabVisible: false,     // +1 tab_hidden
            },
          },
        }],
      },
    });

    expect(response.statusCode).toBe(201);
    const insertCall = mockClient.query.mock.calls.find(
      (call: any[]) => String(call[0]).includes('INSERT INTO events')
    );
    const params = insertCall![1];
    expect(params[9]).toBe(4);
    expect(params[10]).toEqual(
      expect.arrayContaining(['fast_submit', 'no_mouse_move', 'no_keydown', 'tab_hidden'])
    );
  });

  it('assigns risk_score=2 for no_mouse_move + no_keydown', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: { 'x-api-key': 'zt_live_dev', 'content-type': 'application/json' },
      payload: {
        apiKey: 'zt_live_dev',
        events: [{
          ...baseEvent,
          eventId: '550e8400-e29b-41d4-a716-000000000040',
          eventType: 'form_submit',
          eventData: {
            formId: 'contact',
            durationMs: 5000,
            behavioral_signals: {
              durationMs: 5000,
              hadMouseMove: false,
              hadKeydown: false,
              tabVisible: true,
            },
          },
        }],
      },
    });

    expect(response.statusCode).toBe(201);
    const insertCall = mockClient.query.mock.calls.find(
      (call: any[]) => String(call[0]).includes('INSERT INTO events')
    );
    const params = insertCall![1];
    expect(params[9]).toBe(2);
    expect(params[10]).toEqual(expect.arrayContaining(['no_mouse_move', 'no_keydown']));
    expect(params[10]).not.toContain('fast_submit');
  });

  it('scores 0 for non-form_submit event types', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: { 'x-api-key': 'zt_live_dev', 'content-type': 'application/json' },
      payload: {
        apiKey: 'zt_live_dev',
        events: [{ ...baseEvent, eventId: '550e8400-e29b-41d4-a716-000000000050' }],
      },
    });

    expect(response.statusCode).toBe(201);
    const insertCall = mockClient.query.mock.calls.find(
      (call: any[]) => String(call[0]).includes('INSERT INTO events')
    );
    const params = insertCall![1];
    expect(params[9]).toBe(0);
    expect(params[10]).toEqual([]);
  });

  it('accumulates risk across multiple form_submits in the same session', async () => {
    const sessionId = '550e8400-e29b-41d4-a716-446655440002';

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: { 'x-api-key': 'zt_live_dev', 'content-type': 'application/json' },
      payload: {
        apiKey: 'zt_live_dev',
        events: [
          {
            ...baseEvent,
            eventId: '550e8400-e29b-41d4-a716-000000000060',
            sessionId,
            eventType: 'form_submit',
            eventData: {
              formId: 'step1',
              durationMs: 500,
              behavioral_signals: { durationMs: 500, hadMouseMove: true, hadKeydown: true, tabVisible: true },
            },
          },
          {
            ...baseEvent,
            eventId: '550e8400-e29b-41d4-a716-000000000061',
            sessionId,
            eventType: 'form_submit',
            eventData: {
              formId: 'step2',
              durationMs: 5000,
              behavioral_signals: { durationMs: 5000, hadMouseMove: false, hadKeydown: true, tabVisible: true },
            },
          },
        ],
      },
    });

    expect(response.statusCode).toBe(201);

    const insertCalls = mockClient.query.mock.calls.filter(
      (call: any[]) => String(call[0]).includes('INSERT INTO events')
    );
    // Both events in same session share the accumulated risk
    for (const call of insertCalls) {
      const riskScore = call[1][9];
      expect(riskScore).toBe(2); // fast_submit (step1) + no_mouse_move (step2)
    }
  });
});

describe('Security: IP rate limit for identity_linked (Layer 4)', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getClient).mockResolvedValue(mockClient as any);
    mockClient.query.mockResolvedValue({ rows: [] });
    app = buildApp();
  });

  afterEach(() => app.close());

  it('allows identity_linked event when under IP rate limit', async () => {
    vi.mocked(checkIdentityRateLimit).mockResolvedValue(true);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: { 'x-api-key': 'zt_live_dev', 'content-type': 'application/json' },
      payload: {
        apiKey: 'zt_live_dev',
        events: [{
          ...baseEvent,
          eventId: '550e8400-e29b-41d4-a716-000000000070',
          eventType: 'identity_linked',
          eventData: { known_id: 'user_123', linked_at: '2024-01-15T10:30:00.000Z' },
        }],
      },
    });

    expect(response.statusCode).toBe(201);
    expect(checkIdentityRateLimit).toHaveBeenCalledOnce();
  });

  it('returns 429 when IP rate limit is exceeded for identity_linked', async () => {
    vi.mocked(checkIdentityRateLimit).mockResolvedValue(false);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: { 'x-api-key': 'zt_live_dev', 'content-type': 'application/json' },
      payload: {
        apiKey: 'zt_live_dev',
        events: [{
          ...baseEvent,
          eventId: '550e8400-e29b-41d4-a716-000000000080',
          eventType: 'identity_linked',
          eventData: { known_id: 'user_456', linked_at: '2024-01-15T10:30:00.000Z' },
        }],
      },
    });

    expect(response.statusCode).toBe(429);
    expect(JSON.parse(response.body).error).toBe('Rate limit exceeded');
  });

  it('does NOT call checkIdentityRateLimit when batch has no identity_linked events', async () => {
    vi.mocked(checkIdentityRateLimit).mockResolvedValue(true);

    await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: { 'x-api-key': 'zt_live_dev', 'content-type': 'application/json' },
      payload: {
        apiKey: 'zt_live_dev',
        events: [{ ...baseEvent, eventId: '550e8400-e29b-41d4-a716-000000000090' }],
      },
    });

    expect(checkIdentityRateLimit).not.toHaveBeenCalled();
  });

  it('uses x-forwarded-for IP for rate limiting, not raw socket IP', async () => {
    vi.mocked(checkIdentityRateLimit).mockResolvedValue(true);

    await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: {
        'x-api-key': 'zt_live_dev',
        'content-type': 'application/json',
        'x-forwarded-for': '203.0.113.5, 10.0.0.1',
      },
      payload: {
        apiKey: 'zt_live_dev',
        events: [{
          ...baseEvent,
          eventId: '550e8400-e29b-41d4-a716-000000000095',
          eventType: 'identity_linked',
          eventData: { known_id: 'user_789', linked_at: '2024-01-15T10:30:00.000Z' },
        }],
      },
    });

    expect(checkIdentityRateLimit).toHaveBeenCalledWith('203.0.113.5');
  });
});

describe('Security: disposable email detection (Layer 3)', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getClient).mockResolvedValue(mockClient as any);
    mockClient.query.mockResolvedValue({ rows: [] });
    vi.mocked(checkIdentityRateLimit).mockResolvedValue(true);
    app = buildApp();
  });

  afterEach(() => app.close());

  it('assigns risk_score=2 and disposable_email flag for mailinator.com', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: { 'x-api-key': 'zt_live_dev', 'content-type': 'application/json' },
      payload: {
        apiKey: 'zt_live_dev',
        events: [{
          ...baseEvent,
          eventId: '550e8400-e29b-41d4-a716-000000000100',
          eventType: 'identity_linked',
          eventData: {
            known_id: 'user_spam',
            linked_at: '2024-01-15T10:30:00.000Z',
            email: 'fakeuser@mailinator.com',
          },
        }],
      },
    });

    expect(response.statusCode).toBe(201);
    const insertCall = mockClient.query.mock.calls.find(
      (call: any[]) => String(call[0]).includes('INSERT INTO events')
    );
    const params = insertCall![1];
    expect(params[9]).toBe(2);
    expect(params[10]).toContain('disposable_email');
  });

  it('assigns risk_score=0 for a legitimate email domain', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: { 'x-api-key': 'zt_live_dev', 'content-type': 'application/json' },
      payload: {
        apiKey: 'zt_live_dev',
        events: [{
          ...baseEvent,
          eventId: '550e8400-e29b-41d4-a716-000000000110',
          eventType: 'identity_linked',
          eventData: {
            known_id: 'real_user',
            linked_at: '2024-01-15T10:30:00.000Z',
            email: 'nicolas@gmail.com',
          },
        }],
      },
    });

    expect(response.statusCode).toBe(201);
    const insertCall = mockClient.query.mock.calls.find(
      (call: any[]) => String(call[0]).includes('INSERT INTO events')
    );
    const params = insertCall![1];
    expect(params[9]).toBe(0);
    expect(params[10]).not.toContain('disposable_email');
  });

  it('scores 0 when identity_linked has no email field', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: { 'x-api-key': 'zt_live_dev', 'content-type': 'application/json' },
      payload: {
        apiKey: 'zt_live_dev',
        events: [{
          ...baseEvent,
          eventId: '550e8400-e29b-41d4-a716-000000000120',
          eventType: 'identity_linked',
          eventData: { known_id: 'user_noemail', linked_at: '2024-01-15T10:30:00.000Z' },
        }],
      },
    });

    expect(response.statusCode).toBe(201);
    const insertCall = mockClient.query.mock.calls.find(
      (call: any[]) => String(call[0]).includes('INSERT INTO events')
    );
    expect(insertCall![1][9]).toBe(0);
  });

  it('accumulates disposable_email risk on top of behavioral score in the same session', async () => {
    const sessionId = '550e8400-e29b-41d4-a716-000000000130';

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: { 'x-api-key': 'zt_live_dev', 'content-type': 'application/json' },
      payload: {
        apiKey: 'zt_live_dev',
        events: [
          {
            ...baseEvent,
            eventId: '550e8400-e29b-41d4-a716-000000000131',
            sessionId,
            eventType: 'form_submit',
            eventData: {
              formId: 'contact',
              durationMs: 800,
              behavioral_signals: { durationMs: 800, hadMouseMove: true, hadKeydown: true, tabVisible: true },
            },
          },
          {
            ...baseEvent,
            eventId: '550e8400-e29b-41d4-a716-000000000132',
            sessionId,
            eventType: 'identity_linked',
            eventData: {
              known_id: 'spammer',
              linked_at: '2024-01-15T10:30:00.000Z',
              email: 'spammer@guerrillamail.com',
            },
          },
        ],
      },
    });

    expect(response.statusCode).toBe(201);
    const insertCalls = mockClient.query.mock.calls.filter(
      (call: any[]) => String(call[0]).includes('INSERT INTO events')
    );
    for (const call of insertCalls) {
      expect(call[1][9]).toBe(3); // fast_submit(1) + disposable_email(2)
      expect(call[1][10]).toEqual(expect.arrayContaining(['fast_submit', 'disposable_email']));
    }
  });
});

describe('Security: missing API key', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  afterEach(() => app.close());

  it('returns 401 when x-api-key header is absent', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/events',
      headers: { 'content-type': 'application/json' },
      payload: { apiKey: 'zt_live_dev', events: [baseEvent] },
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body).error).toBe('Missing API key');
  });
});
