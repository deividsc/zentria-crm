import { test, expect } from '@playwright/test';
import { Client } from 'pg';

const DB_URL = process.env.DATABASE_URL || 'postgresql://zentria:zentria_dev@localhost:5433/zentria_tracking';
const ODOO_URL = process.env.ODOO_URL || 'http://localhost:8069';
const ODOO_DB = process.env.ODOO_DB || 'odoo';
const ODOO_USER = process.env.ODOO_API_USER || 'admin';
const ODOO_PASSWORD = process.env.ODOO_API_PASSWORD || 'admin';

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

let odooSessionCookie = '';

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
      params: {
        model,
        method,
        args,
        kwargs: { context: {} },
      },
    }),
  });
  const data = await response.json() as { result?: unknown; error?: unknown };
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data.result;
}

async function odooAuthenticate(): Promise<number> {
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
  return data.result.uid;
}

test.describe('Tracking SDK → Odoo CRM full flow', () => {
  const testEmail = `e2e-test+${Date.now()}@zentria.test`;

  test('identity_linked event creates a lead in Odoo CRM', async ({ page }) => {
    // 1. Landing loads
    await page.goto('/');
    await expect(page).toHaveTitle(/Zentria/i);

    // 2. SDK initializes
    await expect(page.evaluate(() => typeof (window as unknown as Record<string, unknown>).ZentriaTracking)).resolves.toBe('object');

    // 3. Scroll to 50% depth
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(500);

    // 4. Click main CTA
    const cta = page.locator('a[href*="demo"], button').filter({ hasText: /demo|contacto|empezar/i }).first();
    if (await cta.count() > 0) await cta.click();
    await page.waitForTimeout(300);

    // 5. Fill and submit contact form
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill(testEmail);

    const nameInput = page.locator('input[type="text"], input[name*="name"], input[placeholder*="nombre"]').first();
    if (await nameInput.count() > 0) await nameInput.fill('E2E Test User');

    const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(1000);

    // 6. Wait for identity_linked event in PostgreSQL (15s timeout)
    const event = await pollDb<{ event_id: string }>(
      `SELECT event_id FROM events WHERE event_type = 'identity_linked' AND known_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [testEmail],
      15_000
    );
    expect(event, `identity_linked event not found for ${testEmail} within 10s`).not.toBeNull();

    // 7. Wait for n8n to process → odoo_sync_log entry (90s — n8n polls every 60s)
    const syncLog = await pollDb<{ status: string; odoo_lead_id: number }>(
      `SELECT status, odoo_lead_id FROM odoo_sync_log WHERE email = $1 AND status IN ('created', 'duplicate') ORDER BY created_at DESC LIMIT 1`,
      [testEmail],
      90_000,
      5_000
    );
    expect(syncLog, `odoo_sync_log entry not found for ${testEmail} within 90s`).not.toBeNull();
    expect(['created', 'duplicate']).toContain(syncLog!.status);

    // 8. Verify lead in Odoo CRM
    await odooAuthenticate();
    const leads = await odooXmlRpc('search_read', 'crm.lead', [
      [['email_from', '=', testEmail]],
      ['id', 'email_from', 'name'],
      0, 1,
    ]) as Array<{ id: number; email_from: string }>;

    expect(leads.length, `No lead found in Odoo for ${testEmail}`).toBeGreaterThan(0);
    expect(leads[0].email_from).toBe(testEmail);
  });
});
