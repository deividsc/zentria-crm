import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateUUID,
  getCookie,
  setCookie,
  initIdentity,
  getIdentity,
  identify,
  resetIdentity,
  __resetIdentityState,
} from '../identity';

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

function clearCookies(): void {
  document.cookie.split(';').forEach((cookie) => {
    const [name] = cookie.split('=');
    document.cookie = `${name.trim()}=; Max-Age=0; Path=/;`;
  });
}

describe('identity', () => {
  beforeEach(() => {
    clearCookies();
    // @ts-expect-error mock localStorage for jsdom compatibility
    global.localStorage = createLocalStorageMock();
    __resetIdentityState();
  });

  afterEach(() => {
    __resetIdentityState();
  });

  describe('generateUUID', () => {
    it('should return a string in UUID v4 format', () => {
      const uuid = generateUUID();
      expect(uuid).toBeTypeOf('string');
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set(Array.from({ length: 100 }, generateUUID));
      expect(uuids.size).toBe(100);
    });
  });

  describe('getCookie / setCookie', () => {
    it('should set and retrieve a cookie', () => {
      setCookie('test_cookie', 'hello', 1);
      expect(getCookie('test_cookie')).toBe('hello');
    });

    it('should return null for non-existent cookie', () => {
      expect(getCookie('non_existent')).toBeNull();
    });

    it('should handle special characters in cookie values', () => {
      setCookie('special', 'hello world! @#$%', 1);
      expect(getCookie('special')).toBe('hello world! @#$%');
    });

    it('should overwrite an existing cookie', () => {
      setCookie('overwrite', 'first', 1);
      setCookie('overwrite', 'second', 1);
      expect(getCookie('overwrite')).toBe('second');
    });
  });

  describe('initIdentity', () => {
    it('should create an anonymousId on first call', () => {
      const identity = initIdentity();
      expect(identity.anonymousId).toBeTypeOf('string');
      expect(identity.anonymousId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(identity.knownId).toBeNull();
      expect(identity.traits).toEqual({});
    });

    it('should store anonymous_id in a cookie', () => {
      const identity = initIdentity();
      const cookieValue = getCookie('__zentria_anon_id');
      expect(cookieValue).toBe(identity.anonymousId);
    });

    it('should return the same identity on subsequent calls (singleton)', () => {
      const first = initIdentity();
      const second = initIdentity();
      expect(second.anonymousId).toBe(first.anonymousId);
    });

    it('should restore anonymousId from existing cookie', () => {
      setCookie('__zentria_anon_id', 'existing-uuid-here', 365);
      const identity = initIdentity();
      expect(identity.anonymousId).toBe('existing-uuid-here');
    });
  });

  describe('getIdentity', () => {
    it('should initialize identity if not already initialized', () => {
      const identity = getIdentity();
      expect(identity.anonymousId).toBeTypeOf('string');
    });
  });

  describe('identify', () => {
    it('should set knownId and traits', () => {
      initIdentity();
      const result = identify('user_123', { plan: 'pro' });
      expect(result.knownId).toBe('user_123');
      expect(result.traits).toEqual({ plan: 'pro' });
    });

    it('should merge traits on subsequent identify calls', () => {
      initIdentity();
      identify('user_123', { plan: 'pro' });
      const result = identify('user_123', { region: 'us' });
      expect(result.traits).toEqual({ plan: 'pro', region: 'us' });
    });

    it('should persist known identity to localStorage', () => {
      initIdentity();
      identify('user_456', { email: 'test@example.com' });
      const stored = localStorage.getItem('__zentria_known');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.knownId).toBe('user_456');
      expect(parsed.traits).toEqual({ email: 'test@example.com' });
    });

    it('should restore known identity from localStorage on init', () => {
      localStorage.setItem('__zentria_known', JSON.stringify({ knownId: 'restored_user', traits: { source: 'test' } }));
      const identity = initIdentity();
      expect(identity.knownId).toBe('restored_user');
      expect(identity.traits).toEqual({ source: 'test' });
    });
  });

  describe('resetIdentity', () => {
    it('should clear knownId and traits but keep anonymousId', () => {
      initIdentity();
      identify('user_123', { plan: 'pro' });
      const beforeReset = getIdentity();
      const anonId = beforeReset.anonymousId;

      resetIdentity();
      const afterReset = getIdentity();
      expect(afterReset.anonymousId).toBe(anonId);
      expect(afterReset.knownId).toBeNull();
      expect(afterReset.traits).toEqual({});
    });

    it('should remove known identity from localStorage', () => {
      initIdentity();
      identify('user_123', { plan: 'pro' });
      resetIdentity();
      expect(localStorage.getItem('__zentria_known')).toBeNull();
    });
  });
});
