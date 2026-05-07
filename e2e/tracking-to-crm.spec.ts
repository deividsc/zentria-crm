import { test, expect } from '@playwright/test';
import { Client } from 'pg';
import { execSync } from 'child_process';

const DB_URL = process.env.DATABASE_URL || 'postgresql://zentria:zentria_dev@localhost:5433/zentria_tracking';
const ODOO_URL = process.env.ODOO_URL || 'http://localhost:8069';
const ODOO_DB = process.env.ODOO_DB || 'odoo';
const ODOO_USER = process.env.ODOO_API_USER || 'admin';
const ODOO_PASSWORD = process.env.ODOO_API_PASSWORD || 'admin';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function pollDb<T>(
  query: string,
  params: unknown[],
  timeoutMs: number,
  intervalMs = 3000
): Promise<T | null> {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  const deadline = Date.now() + timeoutMs;
  try {
    while (Date.now() < deadline) {
      const result = await client.query(query, params);
      if (result.rows.length > 0) return result.rows[0] as T;
      await new Promise(r => setTimeout(r, intervalMs));
    }
    return null;
  } finally {
    await client.end();
  }
}

async function queryDb<T>(query: string, params: unknown[]): Promise<T[]> {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    const result = await client.query(query, params);
    return result.rows as T[];
  } finally {
    await client.end();
  }
}

let odooSessionCookie = '';

async function odooAuthenticate(): Promise<void> {
  const response = await fetch(`${ODOO_URL}/web/session/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: { db: ODOO_DB, login: ODOO_USER, password: ODOO_PASSWORD },
    }),
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) odooSessionCookie = setCookie.split(';')[0];
  const data = await response.json() as { result?: { uid: number } };
  if (!data.result?.uid) throw new Error('Odoo auth failed');
}

async function odooXmlRpc(method: string, model: string, args: unknown[]): Promise<unknown> {
  const response = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(odooSessionCookie ? { 'Cookie': odooSessionCookie } : {}),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: { model, method, args, kwargs: { context: {} } },
    }),
  });
  const data = await response.json() as { result?: unknown; error?: unknown };
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data.result;
}

// ---------------------------------------------------------------------------
// Global setup — reset Redis rate limit keys before each test
// ---------------------------------------------------------------------------

function redisCli(cmd: string): void {
  try {
    execSync(`docker exec zentria-redis redis-cli ${cmd}`, { stdio: 'pipe' });
  } catch {
    // non-zero exit is fine — key may not exist
  }
}

test.beforeEach(async () => {
  redisCli('DEL ratelimit:key:zt_live_dev');
  try {
    const keys = execSync(
      'docker exec zentria-redis redis-cli KEYS "ratelimit:ip:*:identity"',
      { stdio: 'pipe' }
    ).toString().trim();
    if (keys) {
      for (const k of keys.split('\n').filter(Boolean)) {
        redisCli(`DEL ${k.trim()}`);
      }
    }
  } catch { /* no keys to delete */ }
});

// ---------------------------------------------------------------------------
// Suite 1 — Full conversion flow (form submit → DB → Odoo)
// ---------------------------------------------------------------------------

test.describe('Suite 1: Full conversion flow', () => {
  const testEmail = `e2e-full+${Date.now()}@zentria.test`;

  test('form submit → identity_linked event in DB → lead in Odoo', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Zentria/i);

    // SDK must be initialized
    const sdkReady = await page.evaluate(
      () => typeof (window as Record<string, unknown>).ZentriaTracking === 'object'
    );
    expect(sdkReady, 'ZentriaTracking not initialized').toBe(true);

    // Fill and submit — works with email-only or full form
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill(testEmail);

    const nameInput = page.locator('input[type="text"], input[name*="name"], input[placeholder*="nombre"]').first();
    if (await nameInput.count() > 0) await nameInput.fill('E2E Test User');

    const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(1000);

    // identity_linked event must appear in DB within 15s
    const event = await pollDb<{ event_id: string; known_id: string }>(
      `SELECT event_id, known_id FROM events
       WHERE event_type = 'identity_linked' AND known_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [testEmail],
      15_000
    );
    expect(event, `identity_linked not found for ${testEmail}`).not.toBeNull();
    expect(event!.known_id).toBe(testEmail);

    // n8n sync log must arrive within 90s
    const syncLog = await pollDb<{ status: string; odoo_lead_id: number }>(
      `SELECT status, odoo_lead_id FROM odoo_sync_log
       WHERE email = $1 AND status IN ('created', 'duplicate')
       ORDER BY created_at DESC LIMIT 1`,
      [testEmail],
      90_000,
      5_000
    );
    expect(syncLog, `odoo_sync_log not found for ${testEmail}`).not.toBeNull();
    expect(['created', 'duplicate']).toContain(syncLog!.status);

    // Lead must exist in Odoo
    await odooAuthenticate();
    const leads = await odooXmlRpc('search_read', 'crm.lead', [
      [['email_from', '=', testEmail]],
      ['id', 'email_from', 'name'],
      0, 1,
    ]) as Array<{ id: number; email_from: string }>;

    expect(leads.length, `No lead in Odoo for ${testEmail}`).toBeGreaterThan(0);
    expect(leads[0].email_from).toBe(testEmail);
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — SDK tracking events (page_view, scroll)
// ---------------------------------------------------------------------------

test.describe('Suite 2: SDK tracking events', () => {
  test('page_view event is recorded on load', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500); // let SDK flush

    const rows = await queryDb<{ event_type: string }>(
      `SELECT event_type FROM events
       WHERE event_type = 'page_view' AND timestamp > NOW() - INTERVAL '30 seconds'
       LIMIT 1`,
      []
    );
    expect(rows.length, 'No page_view event in DB within 30s of test start').toBeGreaterThan(0);
  });

  test('scroll_depth event is recorded after scrolling past 50%', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(1500);

    const rows = await queryDb<{ event_data: Record<string, unknown> }>(
      `SELECT event_data FROM events
       WHERE event_type = 'scroll_depth' AND timestamp > NOW() - INTERVAL '60 seconds'
       ORDER BY timestamp DESC LIMIT 1`,
      []
    );
    expect(rows.length, 'No scroll_depth event in DB').toBeGreaterThan(0);
    const depth = (rows[0].event_data as { depth?: number }).depth ?? 0;
    expect(depth).toBeGreaterThanOrEqual(40);
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — Behavioral bot detection (direct backend calls — no form selectors)
// ---------------------------------------------------------------------------

test.describe('Suite 3: Behavioral bot detection', () => {
  test('fast submit without interaction sets risk_score >= 1', async ({ page }) => {
    const botEmail = `e2e-bot+${Date.now()}@zentria.test`;
    const sessionId = crypto.randomUUID();
    const anonymousId = crypto.randomUUID();

    const payload = {
      apiKey: 'zt_live_dev',
      events: [{
        eventId: crypto.randomUUID(),
        eventType: 'form_submit',
        eventData: { durationMs: 300, email: botEmail, name: 'Bot User' },
        timestamp: new Date().toISOString(),
        pageUrl: 'http://localhost:8082/',
        pageTitle: 'Zentria Tracking SDK',
        anonymousId,
        knownId: null,
        sessionId,
      }],
    };

    const response = await page.request.post('http://localhost:3000/api/v1/events', {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'zt_live_dev',
        'Origin': 'http://localhost:8082',
      },
    });
    expect(response.status()).toBe(201);

    const event = await pollDb<{ risk_score: number; risk_flags: string[] }>(
      `SELECT risk_score, risk_flags FROM events
       WHERE event_type = 'form_submit'
         AND event_data->>'email' = $1
       ORDER BY timestamp DESC LIMIT 1`,
      [botEmail],
      10_000
    );

    expect(event, `No form_submit found for ${botEmail}`).not.toBeNull();
    expect(event!.risk_score).toBeGreaterThanOrEqual(1);
    expect(event!.risk_flags).toContain('fast_submit');
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — Disposable email detection
// ---------------------------------------------------------------------------

test.describe('Suite 4: Disposable email detection', () => {
  test('mailinator.com email gets risk_score >= 2 and disposable_email flag', async ({ page }) => {
    const disposableEmail = `test+${Date.now()}@mailinator.com`;
    const sessionId = crypto.randomUUID();
    const anonymousId = crypto.randomUUID();

    // Send identity_linked directly — avoids needing specific form fields
    const payload = {
      apiKey: 'zt_live_dev',
      events: [{
        eventId: crypto.randomUUID(),
        eventType: 'identity_linked',
        eventData: {
          known_id: disposableEmail,
          linked_at: new Date().toISOString(),
          email: disposableEmail,
        },
        timestamp: new Date().toISOString(),
        pageUrl: 'http://localhost:8082/',
        pageTitle: 'Zentria Tracking SDK',
        anonymousId,
        knownId: disposableEmail,
        sessionId,
      }],
    };

    const response = await page.request.post('http://localhost:3000/api/v1/events', {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'zt_live_dev',
        'Origin': 'http://localhost:8082',
      },
    });
    expect(response.status()).toBe(201);

    const event = await pollDb<{ risk_score: number; risk_flags: string[] }>(
      `SELECT risk_score, risk_flags FROM events
       WHERE event_type = 'identity_linked' AND known_id = $1
       ORDER BY timestamp DESC LIMIT 1`,
      [disposableEmail],
      10_000
    );

    expect(event, `No identity_linked for ${disposableEmail}`).not.toBeNull();
    expect(event!.risk_score).toBeGreaterThanOrEqual(2);
    expect(event!.risk_flags).toContain('disposable_email');
  });

  test('gmail.com email keeps risk_score = 0', async ({ page }) => {
    const legitimateEmail = `e2e-legit+${Date.now()}@gmail.com`;
    const sessionId = crypto.randomUUID();
    const anonymousId = crypto.randomUUID();

    const payload = {
      apiKey: 'zt_live_dev',
      events: [{
        eventId: crypto.randomUUID(),
        eventType: 'identity_linked',
        eventData: {
          known_id: legitimateEmail,
          linked_at: new Date().toISOString(),
          email: legitimateEmail,
        },
        timestamp: new Date().toISOString(),
        pageUrl: 'http://localhost:8082/',
        pageTitle: 'Zentria Tracking SDK',
        anonymousId,
        knownId: legitimateEmail,
        sessionId,
      }],
    };

    const response = await page.request.post('http://localhost:3000/api/v1/events', {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'zt_live_dev',
        'Origin': 'http://localhost:8082',
      },
    });
    expect(response.status()).toBe(201);

    const event = await pollDb<{ risk_score: number; risk_flags: string[] }>(
      `SELECT risk_score, risk_flags FROM events
       WHERE event_type = 'identity_linked' AND known_id = $1
       ORDER BY timestamp DESC LIMIT 1`,
      [legitimateEmail],
      10_000
    );

    expect(event, `No identity_linked for ${legitimateEmail}`).not.toBeNull();
    expect(event!.risk_score).toBe(0);
    expect(event!.risk_flags).not.toContain('disposable_email');
  });
});
