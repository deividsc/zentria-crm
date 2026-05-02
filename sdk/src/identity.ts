/**
 * Identity Module
 * Manages anonymous_id (UUID v4 cookie) and known_id identity resolution.
 */

const COOKIE_NAME = '__zentria_anon_id';
const COOKIE_MAX_AGE_DAYS = 365;
const LEAD_ID_KEY = '__zentria_lead_id';

/**
 * Generate a UUID v4 string without external dependencies.
 */
export function generateUUID(): string {
  // Use crypto.randomUUID if available (secure, modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback: manual UUID v4 generation
  const hex = '0123456789abcdef';
  let uuid = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-';
    } else if (i === 14) {
      uuid += '4';
    } else if (i === 19) {
      uuid += hex[(Math.random() * 4) | 8]; // variant 10xx
    } else {
      uuid += hex[(Math.random() * 16) | 0];
    }
  }
  return uuid;
}

/**
 * Get a cookie value by name.
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Set a cookie with given name, value and max-age in days.
 */
export function setCookie(name: string, value: string, maxAgeDays: number): void {
  if (typeof document === 'undefined') return;
  const maxAge = maxAgeDays * 24 * 60 * 60;
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
}

export interface IdentityState {
  anonymousId: string;
  knownId: string | null;
  traits: Record<string, unknown>;
  leadId: string;
}

let state: IdentityState | null = null;

/**
 * Initialize identity: read or create anonymous_id cookie,
 * check for existing known_id in localStorage.
 */
export function initIdentity(): IdentityState {
  if (state) return state;

  let anonymousId = getCookie(COOKIE_NAME);
  if (!anonymousId) {
    anonymousId = generateUUID();
    setCookie(COOKIE_NAME, anonymousId, COOKIE_MAX_AGE_DAYS);
  }

  let knownId: string | null = null;
  let traits: Record<string, unknown> = {};
  let leadId: string;

  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('__zentria_known') : null;
    if (stored) {
      const parsed = JSON.parse(stored);
      knownId = parsed.knownId ?? null;
      traits = parsed.traits ?? {};
    }
  } catch {
    // localStorage may be disabled (private mode, etc.)
  }

  try {
    const storedLeadId = typeof localStorage !== 'undefined' ? localStorage.getItem(LEAD_ID_KEY) : null;
    if (storedLeadId) {
      leadId = storedLeadId;
    } else {
      leadId = generateUUID();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LEAD_ID_KEY, leadId);
      }
    }
  } catch {
    leadId = generateUUID();
  }

  state = { anonymousId, knownId, traits, leadId };
  return state;
}

/**
 * Get current identity state.
 */
export function getIdentity(): IdentityState {
  if (!state) return initIdentity();
  return state;
}

/**
 * Identify a user with a known_id and optional traits.
 * Stores known_id in localStorage and updates the identity state.
 */
export function identify(knownId: string, traits?: Record<string, unknown>): IdentityState {
  const identity = getIdentity();
  identity.knownId = knownId;
  if (traits) {
    identity.traits = { ...identity.traits, ...traits };
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('__zentria_known', JSON.stringify({ knownId: identity.knownId, traits: identity.traits }));
    }
  } catch {
    // localStorage may be unavailable
  }

  return identity;
}

/**
 * Reset identity: clear known_id and traits, keep anonymous_id.
 * Useful on logout.
 */
export function resetIdentity(): IdentityState {
  const identity = getIdentity();
  identity.knownId = null;
  identity.traits = {};

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('__zentria_known');
    }
  } catch {
    // localStorage may be unavailable
  }

  return identity;
}

/**
 * Reset the internal identity module state.
 * For testing only — not part of the public API.
 */
export function __resetIdentityState(): void {
  state = null;
}
