import { describe, it, expect, beforeEach } from 'vitest';
import {
  enqueue,
  getQueue,
  removeEvents,
  clearBuffer,
  queueLength,
  loadBuffer,
  persistBuffer,
} from '../buffer';
import type { QueuedEvent } from '../buffer';

function createLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem(key: string): string | null {
      return store[key] ?? null;
    },
    setItem(key: string, value: string): void {
      store[key] = value;
    },
    removeItem(key: string): void {
      delete store[key];
    },
    clear(): void {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    key(index: number): string | null {
      return Object.keys(store)[index] ?? null;
    },
    get length() {
      return Object.keys(store).length;
    },
  };
}

describe('buffer', () => {
  beforeEach(() => {
    clearBuffer();
    // @ts-expect-error mock localStorage for jsdom compatibility
    global.localStorage = createLocalStorageMock();
  });

  const mockEvent = (id: string): QueuedEvent => ({
    eventId: id,
    eventType: 'page_view',
    eventData: {},
    timestamp: new Date().toISOString(),
    pageUrl: 'https://example.com',
    pageTitle: 'Test',
    anonymousId: 'anon-123',
    knownId: null,
    sessionId: 'session-123',
  });

  describe('enqueue', () => {
    it('should add an event to the queue', () => {
      enqueue(mockEvent('evt-1'));
      expect(queueLength()).toBe(1);
    });

    it('should add multiple events in order', () => {
      enqueue(mockEvent('evt-1'));
      enqueue(mockEvent('evt-2'));
      enqueue(mockEvent('evt-3'));
      expect(queueLength()).toBe(3);
      const queue = getQueue();
      expect(queue[0].eventId).toBe('evt-1');
      expect(queue[2].eventId).toBe('evt-3');
    });

    it('should cap queue at MAX_BUFFER_SIZE (100)', () => {
      for (let i = 0; i < 105; i++) {
        enqueue(mockEvent(`evt-${i}`));
      }
      expect(queueLength()).toBe(100);
      const queue = getQueue();
      // Oldest events should be dropped; newest kept
      expect(queue[0].eventId).toBe('evt-5');
      expect(queue[99].eventId).toBe('evt-104');
    });
  });

  describe('getQueue', () => {
    it('should return an empty array when queue is empty', () => {
      expect(getQueue()).toEqual([]);
    });

    it('should return a copy of the queue', () => {
      enqueue(mockEvent('evt-1'));
      const queue = getQueue();
      queue.push(mockEvent('evt-2'));
      expect(queueLength()).toBe(1);
    });
  });

  describe('removeEvents', () => {
    it('should remove events by id', () => {
      enqueue(mockEvent('evt-1'));
      enqueue(mockEvent('evt-2'));
      enqueue(mockEvent('evt-3'));
      removeEvents(new Set(['evt-2']));
      expect(queueLength()).toBe(2);
      expect(getQueue().map((e) => e.eventId)).toEqual(['evt-1', 'evt-3']);
    });

    it('should remove multiple events at once', () => {
      enqueue(mockEvent('evt-1'));
      enqueue(mockEvent('evt-2'));
      enqueue(mockEvent('evt-3'));
      removeEvents(new Set(['evt-1', 'evt-3']));
      expect(queueLength()).toBe(1);
      expect(getQueue()[0].eventId).toBe('evt-2');
    });

    it('should handle removing non-existent event ids gracefully', () => {
      enqueue(mockEvent('evt-1'));
      removeEvents(new Set(['non-existent']));
      expect(queueLength()).toBe(1);
    });
  });

  describe('clearBuffer', () => {
    it('should clear all events', () => {
      enqueue(mockEvent('evt-1'));
      enqueue(mockEvent('evt-2'));
      clearBuffer();
      expect(queueLength()).toBe(0);
      expect(getQueue()).toEqual([]);
    });

    it('should clear localStorage buffer key', () => {
      enqueue(mockEvent('evt-1'));
      clearBuffer();
      expect(localStorage.getItem('__zentria_buffer')).toBeNull();
    });
  });

  describe('persistBuffer / loadBuffer', () => {
    it('should persist queue to localStorage', () => {
      enqueue(mockEvent('evt-1'));
      enqueue(mockEvent('evt-2'));
      const stored = localStorage.getItem('__zentria_buffer');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].eventId).toBe('evt-1');
    });

    it('should load persisted queue from localStorage', () => {
      const events = [mockEvent('evt-a'), mockEvent('evt-b')];
      localStorage.setItem('__zentria_buffer', JSON.stringify(events));
      loadBuffer();
      expect(queueLength()).toBe(2);
      expect(getQueue().map((e) => e.eventId)).toEqual(['evt-a', 'evt-b']);
    });

    it('should handle corrupt localStorage gracefully', () => {
      localStorage.setItem('__zentria_buffer', 'not-json');
      expect(() => loadBuffer()).not.toThrow();
      expect(queueLength()).toBe(0);
    });
  });
});
