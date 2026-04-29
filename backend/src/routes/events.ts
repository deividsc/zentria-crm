import { FastifyInstance } from 'fastify';
import { BatchPayloadSchema } from '../schemas/event.js';
import { getClient } from '../db/index.js';
import { rateLimit } from '../middleware/rateLimit.js';

export default async function eventRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/events', { preHandler: [rateLimit] }, async (request, reply) => {
    const apiKey = request.headers['x-api-key'] as string | undefined;

    if (!apiKey) {
      return reply.status(401).send({ error: 'Missing API key' });
    }

    if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
      return reply.status(401).send({ error: 'Invalid API key' });
    }

    const parseResult = BatchPayloadSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid payload', details: parseResult.error.format() });
    }

    const { events } = parseResult.data;

    // Collect unique sessions to upsert
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
        await client.query(
          `INSERT INTO events (event_id, session_id, anonymous_id, known_id, event_type, event_data, page_url, page_title, timestamp)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
          ]
        );
      }

      await client.query('COMMIT');
      return reply.status(201).send({ success: true, received: events.length });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Error persisting events:', err);
      return reply.status(500).send({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  });
}
