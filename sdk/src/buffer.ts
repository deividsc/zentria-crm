/**
 * Buffer Module
 * In-memory event queue with localStorage offline persistence.
 */

export interface QueuedEvent {
  eventId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  timestamp: string;
  pageUrl: string;
  pageTitle: string;
  anonymousId: string;
  knownId: string | null;
  sessionId: string;
}

const BUFFER_KEY = '__zentria_buffer';
const MAX_BUFFER_SIZE = 100;

let queue: QueuedEvent[] = [];

/**
 * Load any persisted events from localStorage into memory.
 */
export function loadBuffer(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(BUFFER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as QueuedEvent[];
      if (Array.isArray(parsed)) {
        queue = parsed;
      }
    }
  } catch {
    // localStorage unavailable or corrupt
  }
}

/**
 * Persist the current in-memory queue to localStorage.
 */
export function persistBuffer(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(BUFFER_KEY, JSON.stringify(queue.slice(-MAX_BUFFER_SIZE)));
  } catch {
    // localStorage may be full or disabled
  }
}

/**
 * Add an event to the queue. Persists immediately.
 */
export function enqueue(event: QueuedEvent): void {
  queue.push(event);
  if (queue.length > MAX_BUFFER_SIZE) {
    queue = queue.slice(-MAX_BUFFER_SIZE);
  }
  persistBuffer();
}

/**
 * Remove a set of events from the queue by eventId.
 */
export function removeEvents(eventIds: Set<string>): void {
  queue = queue.filter((e) => !eventIds.has(e.eventId));
  persistBuffer();
}

/**
 * Get a copy of the current queue.
 */
export function getQueue(): QueuedEvent[] {
  return queue.slice();
}

/**
 * Clear the entire queue and localStorage.
 */
export function clearBuffer(): void {
  queue = [];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(BUFFER_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Return the current queue length.
 */
export function queueLength(): number {
  return queue.length;
}
