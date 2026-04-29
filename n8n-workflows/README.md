# n8n Workflows

## odoo-lead-ingestion

Routes `identity_linked` tracking events to Odoo CRM as leads.

### How it works

The workflow polls the tracking PostgreSQL every 60 seconds, joining `identity_linked` events with the most recent `form_submit` event on the same `session_id` to extract the contact email. For each unprocessed event it:

1. Claims the event by inserting a row into `odoo_sync_log` (ON CONFLICT DO NOTHING prevents double-processing across overlapping runs)
2. Checks whether a lead with that email already exists in Odoo
3. Either creates the lead or marks the event as a duplicate
4. Updates `odoo_sync_log.status` to `created`, `duplicate`, or `error`

### Prerequisites

- Both Docker stacks running:
  ```bash
  docker compose up -d
  docker compose -f docker-compose.odoo.yml up -d
  ```
- Shared network created once (if not already done):
  ```bash
  docker network create zentria-net
  ```
- CRM module installed in Odoo (see step 4 below)

### Import & Configure

**Step 1 — Open n8n**

Go to [http://localhost:5678](http://localhost:5678) and log in with the credentials from your `.env` file (`N8N_BASIC_AUTH_USER` / `N8N_BASIC_AUTH_PASSWORD`).

**Step 2 — Import the workflow**

Go to **Workflows** in the left sidebar → click **Add workflow** → click the three-dot menu in the top right → **Import from file** → select `n8n-workflows/odoo-lead-ingestion.json`.

**Step 3 — Configure credentials**

In the imported workflow, click any Postgres or Odoo node that shows a credential warning. For each credential type:

- **Postgres Reader** (used by "Fetch Unprocessed Events"):
  - Host: `postgres`
  - Port: `5432`
  - Database: `zentria`
  - User: value of `N8N_PG_READER_USER` from `.env` (default: `n8n_reader`)
  - Password: value of `N8N_PG_READER_PASSWORD` from `.env`
  - SSL: disabled

- **Postgres Writer** (used by "Claim Event", "Mark Duplicate", "Mark Created", "Mark Error"):
  - Host: `postgres`
  - Port: `5432`
  - Database: `zentria`
  - User: value of `N8N_PG_WRITER_USER` from `.env` (default: `n8n_writer`)
  - Password: value of `N8N_PG_WRITER_PASSWORD` from `.env`
  - SSL: disabled

- **Odoo** (used by "Search Existing Lead" and "Create Lead"):
  - URL: `http://odoo:8069`
  - Database: value of `ODOO_DB_NAME` from `.env` (default: `odoo`)
  - Username: value of `ODOO_API_USER` from `.env` (default: `admin`)
  - Password: value of `ODOO_API_PASSWORD` from `.env`

**Step 4 — Install the CRM module in Odoo**

1. Go to [http://localhost:8069](http://localhost:8069)
2. Log in as admin
3. Go to **Settings** → **Apps**
4. Search for **CRM** and click **Install**
5. Wait for the installation to complete (may take 1-2 minutes)

**Step 5 — Activate the workflow**

Back in n8n, open the imported workflow and toggle the **Active** switch in the top right corner. The workflow will now run every 60 seconds.

### Verify first run

Click **Execute Workflow** (the play button) to trigger a manual run immediately.

- If no `identity_linked` events exist yet: the "Has Items?" node outputs to the false branch and execution ends normally — this is correct, no error.
- If events exist: check the **Executions** tab (left sidebar) and inspect each node's output to trace the flow.
- Verify the database:
  ```sql
  SELECT event_id, email, status, odoo_lead_id, error_message, attempts
  FROM odoo_sync_log
  ORDER BY created_at DESC
  LIMIT 20;
  ```
- Verify in Odoo: go to **CRM** → **Leads** — newly created leads appear here.

### Troubleshooting

**`connection refused postgres` / `getaddrinfo ENOTFOUND postgres`**

The tracking stack is not running or the `postgres` service is not on `zentria-net`.

- Check tracking stack: `docker compose ps`
- Check network: `docker network inspect zentria-net` — the `postgres` container should appear in the `Containers` section
- If `postgres` is missing from the network, ensure `docker-compose.yml` has the `zentria-net` network on the `postgres` service and restart: `docker compose up -d`

**`Odoo auth failed` / `Access Denied`**

- Confirm `ODOO_API_USER` and `ODOO_API_PASSWORD` match an active Odoo user with CRM access
- Confirm `ODOO_DB_NAME` matches the database created during Odoo first boot (visit http://localhost:8069/web/database/manager to see the DB name)
- Confirm the CRM module is installed (step 4 above)

**Events stuck in `pending` status**

The `n8n_writer` role may be missing grants on `odoo_sync_log`. Connect as a superuser and run:

```sql
GRANT SELECT, INSERT, UPDATE ON odoo_sync_log TO n8n_writer;
```

**`n8n_reader` cannot see events**

```sql
GRANT SELECT ON events, sessions, anonymous_profiles TO n8n_reader;
GRANT SELECT, INSERT, UPDATE ON odoo_sync_log TO n8n_reader;
```

**Duplicate leads created**

This should not happen if the workflow is working correctly (the "Search Existing Lead" node prevents it). If it does, check:
- The Odoo credential points to the correct database
- The CRM module is active

**`odoo_sync_log` rows showing `attempts > 1` with errors**

The error message in `error_message` column will explain the failure. Common causes:
- Odoo was restarting during the workflow run
- The CRM module was not yet installed when the workflow first ran

Failed rows are retried on subsequent 60-second ticks. To reset a failed row for immediate retry:

```sql
UPDATE odoo_sync_log SET status = 'pending', attempts = 0 WHERE event_id = '<event_id>';
DELETE FROM odoo_sync_log WHERE event_id = '<event_id>';
```
