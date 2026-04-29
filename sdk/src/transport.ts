/**
 * Transport Module
 * Handles sending events to the backend via fetch with retry logic,
 * and sendBeacon fallback on page unload.
 */

import type { QueuedEvent } from './buffer';

export interface TransportConfig {
  endpoint: string;
  apiKey: string;
  retries?: number;
  retryDelayMs?: number;
}

const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;

/**
 * Delay helper for retries.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send a batch of events via fetch with exponential backoff retry.
 */
export async function sendBatch(
  events: QueuedEvent[],
  config: TransportConfig
): Promise<{ sent: string[]; failed: string[] }> {
  const retries = config.retries ?? DEFAULT_RETRIES;
  const retryDelay = config.retryDelayMs ?? DEFAULT_RETRY_DELAY;
  const payload = {
    apiKey: config.apiKey,
    events: events.map((e) => ({
      eventId: e.eventId,
      eventType: e.eventType,
      eventData: e.eventData,
      timestamp: e.timestamp,
      pageUrl: e.pageUrl,
      pageTitle: e.pageTitle,
      anonymousId: e.anonymousId,
      knownId: e.knownId,
      sessionId: e.sessionId,
    })),
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${config.endpoint}/api/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey,
        },
        body: JSON.stringify(payload),
        keepalive: attempt === retries, // keepalive on last attempt
      });

      if (response.ok) {
        return { sent: events.map((e) => e.eventId), failed: [] };
      }

      // Non-retryable status codes
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        break;
      }
    } catch {
      // network or other error — will retry
    }

    if (attempt < retries) {
      await delay(retryDelay * Math.pow(2, attempt));
    }
  }

  return { sent: [], failed: events.map((e) => e.eventId) };
}

/**
 * Send a batch using navigator.sendBeacon as a fallback.
 * Best-effort; no response confirmation.
 */
export function sendBeaconBatch(events: QueuedEvent[], config: TransportConfig): boolean {
  if (typeof navigator === 'undefined' || !navigator.sendBeacon) {
    return false;
  }

  const payload = {
    apiKey: config.apiKey,
    events: events.map((e) => ({
      eventId: e.eventId,
      eventType: e.eventType,
      eventData: e.eventData,
      timestamp: e.timestamp,
      pageUrl: e.pageUrl,
      pageTitle: e.pageTitle,
      anonymousId: e.anonymousId,
      knownId: e.knownId,
      sessionId: e.sessionId,
    })),
  };

  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  return navigator.sendBeacon(`${config.endpoint}/api/v1/events`, blob);
}

/**
 * Register a beforeunload handler to flush remaining events via sendBeacon.
 * Returns an unregister function.
 */
export function registerBeaconUnload(config: TransportConfig, getEvents: () => QueuedEvent[]): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (): void => {
    const events = getEvents();
    if (events.length > 0) {
      sendBeaconBatch(events, config);
    }
  };

  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}
