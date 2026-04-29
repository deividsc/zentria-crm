import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendBatch, sendBeaconBatch, registerBeaconUnload } from '../transport';
import type { QueuedEvent } from '../buffer';

describe('transport', () => {
  const endpoint = 'https://api.example.com';
  const apiKey = 'test-api-key';
  const unregisters: (() => void)[] = [];

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

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    unregisters.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    // Clean up all registered beacon unload handlers
    unregisters.forEach((fn) => fn());
    unregisters.length = 0;
  });

  function trackUnregister(fn: () => void): void {
    unregisters.push(fn);
  }

  describe('sendBatch', () => {
    it('should send events and return all as sent on success', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
      } as Response);

      const events = [mockEvent('evt-1'), mockEvent('evt-2')];
      const result = await sendBatch(events, { endpoint, apiKey });

      expect(result.sent).toEqual(['evt-1', 'evt-2']);
      expect(result.failed).toEqual([]);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        `${endpoint}/api/v1/events`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
          }),
        })
      );
    });

    it('should retry on network failure and eventually succeed', async () => {
      global.fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, status: 201 } as Response);

      const events = [mockEvent('evt-1')];
      const promise = sendBatch(events, { endpoint, apiKey, retries: 3, retryDelayMs: 1000 });

      await vi.advanceTimersByTimeAsync(1000);
      const result = await promise;

      expect(result.sent).toEqual(['evt-1']);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should return all events as failed after exhausting retries', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const events = [mockEvent('evt-1'), mockEvent('evt-2')];
      const promise = sendBatch(events, { endpoint, apiKey, retries: 2, retryDelayMs: 100 });

      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);
      const result = await promise;

      expect(result.sent).toEqual([]);
      expect(result.failed).toEqual(['evt-1', 'evt-2']);
      expect(fetch).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should not retry on 400 Bad Request', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
      } as Response);

      const events = [mockEvent('evt-1')];
      const result = await sendBatch(events, { endpoint, apiKey, retries: 3 });

      expect(result.failed).toEqual(['evt-1']);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 401 Unauthorized', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      } as Response);

      const events = [mockEvent('evt-1')];
      const result = await sendBatch(events, { endpoint, apiKey, retries: 3 });

      expect(result.failed).toEqual(['evt-1']);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 403 Forbidden', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      } as Response);

      const events = [mockEvent('evt-1')];
      const result = await sendBatch(events, { endpoint, apiKey, retries: 3 });

      expect(result.failed).toEqual(['evt-1']);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on 500 Server Error', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
        .mockResolvedValueOnce({ ok: true, status: 201 } as Response);

      const events = [mockEvent('evt-1')];
      const promise = sendBatch(events, { endpoint, apiKey, retries: 3, retryDelayMs: 100 });

      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result.sent).toEqual(['evt-1']);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should apply exponential backoff between retries', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('fail'));

      const events = [mockEvent('evt-1')];
      sendBatch(events, { endpoint, apiKey, retries: 3, retryDelayMs: 100 });

      expect(fetch).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(100);
      expect(fetch).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(200);
      expect(fetch).toHaveBeenCalledTimes(3);

      await vi.advanceTimersByTimeAsync(400);
      expect(fetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('sendBeaconBatch', () => {
    it('should return false when navigator.sendBeacon is unavailable', () => {
      const originalNavigator = global.navigator;
      // @ts-expect-error navigator is read-only in TS
      global.navigator = undefined;

      const result = sendBeaconBatch([mockEvent('evt-1')], { endpoint, apiKey });
      expect(result).toBe(false);

      // @ts-expect-error
      global.navigator = originalNavigator;
    });

    it('should return false when sendBeacon is not supported', () => {
      const originalSendBeacon = navigator.sendBeacon;
      // @ts-expect-error mock
      navigator.sendBeacon = undefined;

      const result = sendBeaconBatch([mockEvent('evt-1')], { endpoint, apiKey });
      expect(result).toBe(false);

      // @ts-expect-error
      navigator.sendBeacon = originalSendBeacon;
    });

    it('should call navigator.sendBeacon with Blob payload', () => {
      const sendBeaconMock = vi.fn().mockReturnValue(true);
      // @ts-expect-error mock
      navigator.sendBeacon = sendBeaconMock;

      const events = [mockEvent('evt-1')];
      const result = sendBeaconBatch(events, { endpoint, apiKey });

      expect(result).toBe(true);
      expect(sendBeaconMock).toHaveBeenCalledTimes(1);
      expect(sendBeaconMock).toHaveBeenCalledWith(
        `${endpoint}/api/v1/events`,
        expect.any(Blob)
      );

      const blob = sendBeaconMock.mock.calls[0][1] as Blob;
      expect(blob.type).toBe('application/json');
    });
  });

  describe('registerBeaconUnload', () => {
    it('should register a beforeunload listener', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      const unregister = registerBeaconUnload(
        { endpoint, apiKey },
        () => [mockEvent('evt-1')]
      );
      trackUnregister(unregister);

      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
      addEventListenerSpy.mockRestore();
    });

    it('should return an unregister function that removes the listener', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const unregister = registerBeaconUnload(
        { endpoint, apiKey },
        () => [mockEvent('evt-1')]
      );
      trackUnregister(unregister);

      unregister();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });

    it('should call sendBeacon on beforeunload when events exist', () => {
      const sendBeaconMock = vi.fn().mockReturnValue(true);
      // @ts-expect-error mock
      navigator.sendBeacon = sendBeaconMock;

      const unregister = registerBeaconUnload(
        { endpoint, apiKey },
        () => [mockEvent('evt-1')]
      );
      trackUnregister(unregister);

      const event = new Event('beforeunload');
      window.dispatchEvent(event);

      expect(sendBeaconMock).toHaveBeenCalledTimes(1);
    });

    it('should not call sendBeacon when queue is empty', () => {
      const sendBeaconMock = vi.fn().mockReturnValue(true);
      // @ts-expect-error mock
      navigator.sendBeacon = sendBeaconMock;

      const unregister = registerBeaconUnload(
        { endpoint, apiKey },
        () => []
      );
      trackUnregister(unregister);

      const event = new Event('beforeunload');
      window.dispatchEvent(event);

      expect(sendBeaconMock).not.toHaveBeenCalled();
    });
  });
});
