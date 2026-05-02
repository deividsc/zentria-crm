/**
 * Zentria Tracking SDK
 * Lightweight analytics SDK for landings
 */

import { initIdentity, getIdentity, identify, resetIdentity, generateUUID } from './identity';
import { loadBuffer, enqueue, getQueue, removeEvents, queueLength } from './buffer';
import { sendBatch, registerBeaconUnload } from './transport';
import { initCapture, capturePageView } from './capture';
import type { TransportConfig } from './transport';
import type { QueuedEvent } from './buffer';

export interface SDKConfig {
  apiKey: string;
  endpoint: string;
  debug?: boolean;
  captureClicks?: boolean;
  captureForms?: boolean;
  captureScroll?: boolean;
  scrollThresholds?: number[];
  consentRequired?: boolean;
}

interface SDKState {
  initialized: boolean;
  config: SDKConfig | null;
  sessionId: string;
  flushInterval: ReturnType<typeof setInterval> | null;
  beaconCleanup: (() => void) | null;
  captureCleanup: (() => void) | null;
  consentGiven: boolean;
}

const state: SDKState = {
  initialized: false,
  config: null,
  sessionId: '',
  flushInterval: null,
  beaconCleanup: null,
  captureCleanup: null,
  consentGiven: false,
};

/**
 * Log debug messages when debug mode is enabled.
 */
function debug(...args: unknown[]): void {
  if (state.config?.debug) {
    // eslint-disable-next-line no-console
    console.log('[Zentria]', ...args);
  }
}

/**
 * Check if the user has given tracking consent.
 * If consentRequired is false, always returns true.
 */
function hasConsent(): boolean {
  if (!state.config?.consentRequired) return true;
  return state.consentGiven;
}

/**
 * Set tracking consent (GDPR / CCPA compliance).
 */
export function setConsent(given: boolean): void {
  state.consentGiven = given;
  debug('Consent set to:', given);
}

/**
 * Flush queued events to the backend.
 */
export async function flush(): Promise<void> {
  if (!state.initialized || !state.config) {
    debug('Cannot flush: SDK not initialized');
    return;
  }

  if (!hasConsent()) {
    debug('Cannot flush: consent not given');
    return;
  }

  const events = getQueue();
  if (events.length === 0) {
    debug('Flush: no events to send');
    return;
  }

  const transportConfig: TransportConfig = {
    endpoint: state.config.endpoint,
    apiKey: state.config.apiKey,
  };

  debug(`Flushing ${events.length} events...`);

  try {
    const result = await sendBatch(events, transportConfig);
    removeEvents(new Set(result.sent));
    debug(`Flush complete: ${result.sent.length} sent, ${result.failed.length} failed`);
  } catch (err) {
    debug('Flush error:', err);
  }
}

/**
 * Track a custom event.
 */
export function track(eventType: string, eventData?: Record<string, unknown>): void {
  if (!state.initialized || !state.config) {
    debug('Cannot track: SDK not initialized');
    return;
  }

  if (!hasConsent()) {
    debug('Cannot track: consent not given');
    return;
  }

  const identity = getIdentity();
  const event: QueuedEvent = {
    eventId: generateUUID(),
    eventType,
    eventData: eventData ?? {},
    timestamp: new Date().toISOString(),
    pageUrl: typeof location !== 'undefined' ? location.href : '',
    pageTitle: typeof document !== 'undefined' ? document.title : '',
    anonymousId: identity.anonymousId,
    knownId: identity.knownId,
    sessionId: state.sessionId,
    leadId: identity.leadId,
  };

  enqueue(event);
  debug('Tracked:', eventType, eventData);
}

/**
 * Identify the current user with a known ID and optional traits.
 */
export function identifyUser(knownId: string, traits?: Record<string, unknown>): void {
  if (!state.initialized) {
    debug('Cannot identify: SDK not initialized');
    return;
  }

  identify(knownId, traits);
  track('identity_linked', {
    known_id: knownId,
    linked_at: new Date().toISOString(),
  });
  debug('Identified user:', knownId, traits);
}

/**
 * Reset the current user's identity (logout).
 */
export function resetUser(): void {
  if (!state.initialized) {
    debug('Cannot reset: SDK not initialized');
    return;
  }

  resetIdentity();
  debug('User identity reset');
}

/**
 * Initialize the Zentria Tracking SDK.
 */
export function init(config: SDKConfig): void {
  if (state.initialized) {
    debug('SDK already initialized');
    return;
  }

  state.config = config;
  state.sessionId = generateUUID();
  state.initialized = true;

  // Initialize identity
  initIdentity();

  // Load any buffered events from previous sessions
  loadBuffer();

  // Register beacon unload handler
  if (typeof window !== 'undefined') {
    state.beaconCleanup = registerBeaconUnload(
      { endpoint: config.endpoint, apiKey: config.apiKey },
      getQueue
    );
  }

  // Start periodic flush (every 5 seconds)
  state.flushInterval = setInterval(() => {
    flush().catch(() => {
      // ignore interval errors
    });
  }, 5000);

  // Initialize auto-capture
  const identity = getIdentity();
  state.captureCleanup = initCapture(
    (event) => enqueue({ ...event, leadId: getIdentity().leadId }),
    identity.anonymousId,
    identity.knownId,
    state.sessionId,
    {
      captureClicks: config.captureClicks,
      captureForms: config.captureForms,
      captureScroll: config.captureScroll,
      scrollThresholds: config.scrollThresholds,
    }
  );

  // Emit initial page view
  if (hasConsent()) {
    capturePageView(identity.anonymousId, identity.knownId, state.sessionId);
  }

  debug('Zentria SDK initialized', config);
}

/**
 * Destroy the SDK instance: stop listeners, clear intervals.
 */
export function destroy(): void {
  if (!state.initialized) return;

  if (state.flushInterval) {
    clearInterval(state.flushInterval);
    state.flushInterval = null;
  }

  if (state.beaconCleanup) {
    state.beaconCleanup();
    state.beaconCleanup = null;
  }

  if (state.captureCleanup) {
    state.captureCleanup();
    state.captureCleanup = null;
  }

  state.initialized = false;
  state.config = null;
  debug('Zentria SDK destroyed');
}

/**
 * Get the current queue length (useful for debugging).
 */
export function getQueueLength(): number {
  return queueLength();
}

// Re-export types for consumers
export { generateUUID };

// Default export for UMD / IIFE builds
export default {
  init,
  track,
  identify: identifyUser,
  resetUser,
  flush,
  setConsent,
  destroy,
  getQueueLength,
};
