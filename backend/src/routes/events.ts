import { FastifyInstance } from 'fastify';
import { BatchPayloadSchema } from '../schemas/event.js';
import { getClient } from '../db/index.js';
import { rateLimit, checkIdentityRateLimit } from '../middleware/rateLimit.js';
import { originCheck } from '../middleware/originCheck.js';
import disposableDomains from 'disposable-email-domains';

const disposableSet = new Set<string>(disposableDomains as string[]);

function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? disposableSet.has(domain) : false;
}

interface BehavioralSignals {
  durationMs?: number | null;
  hadMouseMove?: boolean | null;
  hadKeydown?: boolean | null;
  hadFocus?: boolean | null;
  tabVisible?: boolean | null;
}

function scoreBehavior(signals: BehavioralSignals): { score: number; flags: string[] } {
  const flags: string[] = [];
  let score = 0;

  if (signals.durationMs != null && signals.durationMs < 2000) {
    score++;
    flags.push('fast_submit');
  }
  if (signals.hadMouseMove === false) {
    score++;
    flags.push('no_mouse_move');
  }
  if (signals.hadKeydown === false) {
    score++;
    flags.push('no_keydown');
  }
  if (signals.tabVisible === false) {
    score++;
    flags.push('tab_hidden');
  }

  return { score, flags };
}

export default async function eventRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/events', { preHandler: [rateLimit, originCheck] }, async (request, reply) => {
    const apiKey = request.headers['x-api-key'] as string | undefined;

    if (!apiKey) {
      return reply.status(401).send({ error: 'Missing API key' });
    }

    const parseResult = BatchPayloadSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid payload', details: parseResult.error.format() });
    }

    const { events } = parseResult.data;
    const clientIp = (request as typeof request & { clientIp?: string }).clientIp ?? request.ip;

    // Layer 4: IP rate limit for identity_linked events
    const hasIdentityEvent = events.some(e => e.eventType === 'identity_linked');
    if (hasIdentityEvent) {
      const allowed = await checkIdentityRateLimit(clientIp);
      if (!allowed) {
        return reply.status(429).send({ error: 'Rate limit exceeded' });
      }
    }

    // Layer 2 + 3: behavioral scoring and disposable email check per session
    const sessionRisk = new Map<string, { score: number; flags: string[] }>();

    for (const event of events) {
      const existing = sessionRisk.get(event.sessionId) ?? { score: 0, flags: [] };

      if (event.eventType === 'form_submit') {
        const data = event.eventData as Record<string, unknown>;
        const signals = (data.behavioral_signals ?? data) as BehavioralSignals;
        const { score, flags } = scoreBehavior(signals);
        sessionRisk.set(event.sessionId, {
          score: existing.score + score,
          flags: [...existing.flags, ...flags],
        });
      }

      if (event.eventType === 'identity_linked') {
        const data = event.eventData as Record<string, unknown>;
        const email = typeof data.email === 'string' ? data.email : null;
        if (email && isDisposableEmail(email)) {
          sessionRisk.set(event.sessionId, {
            score: existing.score + 2,
            flags: [...existing.flags, 'disposable_email'],
          });
        }
      }
    }

    const sessionMap = new Map<string, { anonymousId: string; knownId: string | null }>();
    for (const event of events) {
      if (!sessionMap.has(event.sessionId)) {
        sessionMap.set(event.sessionId, { anonymousId: event.anonymousId, knownId: event.knownId });
      }
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      for (const [sessionId, { anonymousId, knownId }] of sessionMap) {
        await client.query(
          `INSERT INTO sessions (id, anonymous_id, known_id, started_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (id) DO NOTHING`,
          [sessionId, anonymousId, knownId]
        );
      }

      for (const event of events) {
        const risk = sessionRisk.get(event.sessionId) ?? { score: 0, flags: [] };

        await client.query(
          `INSERT INTO events (event_id, session_id, anonymous_id, known_id, event_type, event_data, page_url, page_title, timestamp, risk_score, risk_flags)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (event_id) DO NOTHING`,
          [
            event.eventId,
            event.sessionId,
            event.anonymousId,
            event.knownId,
            event.eventType,
            JSON.stringify(event.eventData),
            event.pageUrl,
            event.pageTitle,
            event.timestamp,
            risk.score,
            risk.flags,
          ]
        );
      }

      await client.query('COMMIT');
      return reply.status(201).send({ success: true, received: events.length });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      request.log.error({ err }, 'Error persisting events');
      return reply.status(500).send({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  });
}
