import { describe, it, expect } from 'vitest';
import { BatchPayloadSchema, EventSchema } from '../schemas/event';

describe('EventSchema', () => {
  const validPageView = {
    eventId: '550e8400-e29b-41d4-a716-446655440000',
    eventType: 'page_view' as const,
    eventData: {
      referrer: 'https://google.com',
      utm_source: 'newsletter',
      utm_medium: 'email',
      utm_campaign: 'spring_sale',
    },
    timestamp: '2024-01-15T10:30:00.000Z',
    pageUrl: 'https://example.com/landing',
    pageTitle: 'Welcome',
    anonymousId: '550e8400-e29b-41d4-a716-446655440001',
    knownId: null,
    sessionId: '550e8400-e29b-41d4-a716-446655440002',
  };

  it('should validate a correct page_view event', () => {
    const result = EventSchema.safeParse(validPageView);
    expect(result.success).toBe(true);
  });

  it('should validate all 7 event types', () => {
    const base = {
      eventId: '550e8400-e29b-41d4-a716-446655440000',
      timestamp: '2024-01-15T10:30:00.000Z',
      pageUrl: 'https://example.com',
      pageTitle: 'Test',
      anonymousId: '550e8400-e29b-41d4-a716-446655440001',
      knownId: null,
      sessionId: '550e8400-e29b-41d4-a716-446655440002',
    };

    const eventTypes = [
      { eventType: 'page_view' as const, eventData: { referrer: '' } },
      { eventType: 'scroll_depth' as const, eventData: { depth: 50, maxDepth: 75 } },
      { eventType: 'cta_click' as const, eventData: { selector: 'button#cta.btn', cta_text: 'Click me', x: 100, y: 200 } },
      { eventType: 'form_start' as const, eventData: { formId: 'contact' } },
      { eventType: 'form_submit' as const, eventData: { formId: 'contact', durationMs: 5000 } },
      { eventType: 'form_abandon' as const, eventData: { formId: 'contact', durationMs: 3000 } },
      {
        eventType: 'identity_linked' as const,
        eventData: {
          known_id: '550e8400-e29b-41d4-a716-446655440099',
          linked_at: '2024-01-15T10:30:00.000Z',
        },
      },
    ];

    for (const evt of eventTypes) {
      const result = EventSchema.safeParse({ ...base, ...evt });
      expect(result.success).toBe(true);
    }
  });

  it('should reject an invalid eventType', () => {
    const result = EventSchema.safeParse({
      ...validPageView,
      eventType: 'unknown_event',
    });
    expect(result.success).toBe(false);
  });

  it('should reject an invalid UUID format', () => {
    const result = EventSchema.safeParse({
      ...validPageView,
      eventId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('should reject an invalid timestamp', () => {
    const result = EventSchema.safeParse({
      ...validPageView,
      timestamp: 'yesterday',
    });
    expect(result.success).toBe(false);
  });

  it('should reject a pageUrl exceeding 2048 chars', () => {
    const result = EventSchema.safeParse({
      ...validPageView,
      pageUrl: 'https://example.com/' + 'a'.repeat(2048),
    });
    expect(result.success).toBe(false);
  });

  it('should reject scroll_depth with depth out of range', () => {
    const result = EventSchema.safeParse({
      ...validPageView,
      eventType: 'scroll_depth',
      eventData: { depth: 101, maxDepth: 50 },
    });
    expect(result.success).toBe(false);
  });

  it('should reject cta_click missing required selector field', () => {
    const result = EventSchema.safeParse({
      ...validPageView,
      eventType: 'cta_click',
      eventData: { cta_text: 'Click', x: 0, y: 0 },
    });
    expect(result.success).toBe(false);
  });

  it('should accept knownId as string', () => {
    const result = EventSchema.safeParse({
      ...validPageView,
      knownId: 'user_123',
    });
    expect(result.success).toBe(true);
  });
});

describe('BatchPayloadSchema', () => {
  const validPayload = {
    apiKey: 'test-api-key',
    events: [
      {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        eventType: 'page_view' as const,
        eventData: { referrer: '' },
        timestamp: '2024-01-15T10:30:00.000Z',
        pageUrl: 'https://example.com',
        pageTitle: 'Test',
        anonymousId: '550e8400-e29b-41d4-a716-446655440001',
        knownId: null,
        sessionId: '550e8400-e29b-41d4-a716-446655440002',
      },
    ],
  };

  it('should validate a correct batch payload', () => {
    const result = BatchPayloadSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('should reject empty apiKey', () => {
    const result = BatchPayloadSchema.safeParse({
      ...validPayload,
      apiKey: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty events array', () => {
    const result = BatchPayloadSchema.safeParse({
      ...validPayload,
      events: [],
    });
    expect(result.success).toBe(false);
  });

  it('should reject more than 100 events', () => {
    const events = Array.from({ length: 101 }, (_, i) => ({
      ...validPayload.events[0],
      eventId: `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`,
    }));
    const result = BatchPayloadSchema.safeParse({
      ...validPayload,
      events,
    });
    expect(result.success).toBe(false);
  });

  it('should accept exactly 100 events', () => {
    const events = Array.from({ length: 100 }, (_, i) => ({
      ...validPayload.events[0],
      eventId: `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`,
    }));
    const result = BatchPayloadSchema.safeParse({
      ...validPayload,
      events,
    });
    expect(result.success).toBe(true);
  });
});
