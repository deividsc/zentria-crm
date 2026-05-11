# n8n Workflows

Zentria CRM uses two complementary n8n workflows for lead ingestion. Both can run simultaneously without creating duplicates.

---

## Architecture

```
Landing form
  │
  ├─► [webform-to-odoo-lead] ──► Odoo CRM  (immediate, synchronous)
  │
  └─► Tracking SDK ──► PostgreSQL
                          │
                          └─► [odoo-lead-ingestion] ──► Odoo CRM  (async, with dedup)
```

---

## webform-to-odoo-lead

**Purpose:** Receives the form POST directly from the landing page webhook, normalizes the data, resolves UTM IDs in Odoo, and creates the lead immediately.

**Trigger:** HTTP POST to `/webhook/lead-webform`

**Required env vars** (set in n8n environment or `docker-compose.odoo.yml`):

| Variable | Description |
|----------|-------------|
| `ODOO_URL` | Base URL of the Odoo instance (e.g. `http://odoo:8069`) |
| `ODOO_DB` | Odoo database name |
| `ODOO_LOGIN` | Odoo user login |
| `ODOO_PASSWORD` | Odoo user password |

**Fields processed:** `firstname`, `lastname`, `email`, `phone`, `dni`, `adult`, `estudios`, `postal`, `trabajo`, `disqualified`, `disqualify_reasons`, `source`, `medium`, `campaign`

**Responses:**
- `200 OK` — lead created, body: `{ "status": "ok", "lead_id": <id> }`
- `400 Bad Request` — missing required fields (`firstname`, `email`)
- `500 Internal Server Error` — Odoo creation failed

### Import & Activate

1. Open n8n at [http://localhost:5678](http://localhost:5678)
2. **Workflows** → **Add workflow** → three-dot menu → **Import from file** → select `webform-to-odoo-lead.json`
3. No credentials to configure — the workflow uses HTTP requests with session cookies (credentials come from env vars above)
4. Toggle **Active** in the top right

---

## odoo-lead-ingestion

**Purpose:** Polls the tracking PostgreSQL every 60 seconds for unprocessed `identity_linked` events and creates leads in Odoo. Provides retry logic, deduplication, and an audit trail via `odoo_sync_log`.

**Trigger:** Schedule (every 60s)

**Required credentials** (configured in n8n UI):

- **Postgres Reader** — connects to the tracking DB
  - Host: `postgres`, Port: `5432`, Database: `zentria`
  - User/Password: values of `N8N_PG_READER_USER` / `N8N_PG_READER_PASSWORD` from `.env`
- **Postgres Writer** — writes sync status to `odoo_sync_log`
  - Host: `postgres`, Port: `5432`, Database: `zentria`
  - User/Password: values of `N8N_PG_WRITER_USER` / `N8N_PG_WRITER_PASSWORD` from `.env`
- **Odoo** — creates/checks leads
  - URL: `http://odoo:8069`
  - DB / User / Password: values of `ODOO_DB_NAME` / `ODOO_LOGIN` / `ODOO_PASSWORD` from `.env`

### Import & Configure

1. Open n8n → **Import from file** → select `odoo-lead-ingestion.json`
2. Click each node with a credential warning and assign the credentials above
3. Toggle **Active**

### Verify

```sql
SELECT event_id, email, status, odoo_lead_id, error_message, attempts
FROM odoo_sync_log
ORDER BY created_at DESC
LIMIT 20;
```

### Troubleshooting

**`connection refused postgres`**
Check tracking stack: `docker compose ps` — ensure `postgres` is on `zentria-net`.

**`Odoo auth failed`**
Confirm credentials in the Odoo node match an active Odoo user with CRM access.

**Events stuck in `pending`**
```sql
GRANT SELECT, INSERT, UPDATE ON odoo_sync_log TO n8n_writer;
```

**Retry a failed row**
```sql
UPDATE odoo_sync_log SET status = 'pending', attempts = 0 WHERE event_id = '<id>';
```

---

## Running both workflows simultaneously

Both workflows check for existing leads before creating (`search_read` by `email_from`), so running both in parallel does **not** create duplicate leads. The `odoo_sync_log` table records the final outcome for audit purposes.
