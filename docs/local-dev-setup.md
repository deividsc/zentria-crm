# Local Dev Setup

Full stack: Tracking SDK → Fastify API → PostgreSQL → n8n → Odoo CRM.

## Prerequisites

- Docker Desktop running
- Node.js 20+
- `npx serve` available (`npm install -g serve`)

## First-time setup

### 1. Shared Docker network (one-time)

```bash
docker network create zentria-net
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` — minimum required values:

```env
DB_PASSWORD=zentria_dev
ODOO_DB_PASSWORD=odoo_db_password
N8N_BASIC_AUTH_PASSWORD=admin123
N8N_ENCRYPTION_KEY=9e43b88dc9035fb1bf3a1898f2452f69   # generate with: openssl rand -hex 16
N8N_PG_READER_PASSWORD=reader123
N8N_PG_WRITER_PASSWORD=writer123
```

### 3. Update `odoo/odoo.conf`

Set `db_password` to match `ODOO_DB_PASSWORD` in your `.env`:

```ini
[options]
addons_path = /mnt/extra-addons
data_dir = /var/lib/odoo
db_host = odoo-postgres
db_port = 5432
db_user = odoo
db_password = odoo_db_password   # ← match ODOO_DB_PASSWORD
admin_passwd = admin
```

> `odoo.conf` is mounted read-only into the Odoo container. This ensures `docker exec` commands also pick up the correct DB credentials (bypassing the entrypoint env var approach which is unreliable for manual commands).

### 4. Start the tracking stack

```bash
docker compose up -d
```

Verify: `curl http://localhost:3000/health` → `{"status":"ok"}`

> **Port note**: tracking postgres binds to host port **5433** (not 5432) to avoid conflicts with other local postgres instances.

### 5. Start the Odoo + n8n stack

```bash
docker compose -f docker-compose.odoo.yml up -d
```

Odoo takes ~2 minutes to start on first boot. Monitor with:

```bash
docker logs -f zentria-crm-odoo-1
```

Wait until you see `odoo.modules.loading: Modules loaded`.

### 6. Initialize Odoo database (first time only)

```bash
docker exec zentria-crm-odoo-1 odoo --init base -d odoo --stop-after-init
```

This installs the base Odoo module. Takes 3–5 minutes. The container stops automatically when done — restart it:

```bash
docker compose -f docker-compose.odoo.yml up -d
```

Verify: open http://localhost:8069 → Odoo login screen.

### 7. Install the CRM module

1. Log in to Odoo with user `admin` / password from `admin_passwd` in `odoo.conf`
2. Go to **Settings → Apps**
3. Search for **CRM** → Install

### 8. Serve the landing

```bash
npx serve landing -p 8080
```

Open http://localhost:8080

### 9. Import and activate the n8n workflow

1. Open http://localhost:5678 — log in with `N8N_BASIC_AUTH_USER` / `N8N_BASIC_AUTH_PASSWORD` from `.env`
2. **Workflows → Import from file** → select `n8n-workflows/odoo-lead-ingestion.json`
3. Configure credentials (see `n8n-workflows/README.md` for details):
   - Postgres Reader: host=`postgres`, port=5432, db=`zentria_tracking`, user=`n8n_reader`, password=`N8N_PG_READER_PASSWORD`
   - Postgres Writer: same host/db, user=`n8n_writer`, password=`N8N_PG_WRITER_PASSWORD`
   - Odoo: URL=`http://odoo:8069`, db=`odoo`, user=`admin`, password=`admin_passwd` from odoo.conf
4. **Activate** the workflow (toggle at top right)

## Daily start

```bash
docker compose up -d
docker compose -f docker-compose.odoo.yml up -d
npx serve landing -p 8080
```

## Verify full flow

1. Open http://localhost:8080
2. Fill and submit the contact form with a real email
3. Within 60s, check n8n executions at http://localhost:5678
4. Check Odoo CRM → Leads for the new entry

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `port 5432 already allocated` | Another postgres on host | Tracking postgres uses port 5433 — check `DB_PORT` in `.env` |
| `port 8069 already allocated` | Previous Odoo container | `docker rm -f <container-name>` |
| Odoo `Internal Server Error` | DB not initialized | Run step 6 (init base) |
| `docker exec odoo` connects via socket | entrypoint not used | Fixed by mounting `odoo/odoo.conf` |
| n8n can't reach tracking postgres | zentria-net missing | `docker network create zentria-net` |
| API build fails with `tsc: not found` | devDeps not installed | Multi-stage Dockerfile — `npm ci` (all deps) in builder stage |
| `dist/server.js` not found | Volume overwrites image build | Dev volume mounts removed from api service |
