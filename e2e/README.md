# E2E Tests — Playwright

Full end-to-end flow: Landing → Tracking SDK → PostgreSQL → n8n → Odoo CRM.

## Prerequisites

Both Docker stacks must be running:

```bash
docker network create zentria-net   # one-time
docker compose up -d                 # tracking stack
docker compose -f docker-compose.odoo.yml up -d  # Odoo + n8n stack
```

Also required:
- n8n workflow imported and **active** (see `n8n-workflows/README.md`)
- Odoo **CRM module installed** (Settings → Apps → CRM)
- Landing served at `http://localhost:8080` (e.g. `npx serve landing -p 8080`)

## Install

```bash
npm install
npx playwright install chromium
```

## Environment variables

Copy `.env.example` to `.env` and fill in real values. The tests read:

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:8080` | Landing page URL |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/zentria` | Tracking DB |
| `ODOO_URL` | `http://localhost:8069` | Odoo instance |
| `ODOO_DB` | `odoo` | Odoo database name |
| `ODOO_API_USER` | `admin` | Odoo login |
| `ODOO_API_PASSWORD` | `admin` | Odoo password |

## Run

```bash
npm run test:e2e
```

View the HTML report after a run:

```bash
npm run test:e2e:report
```

## Notes

- The test waits up to **90 seconds** for n8n to process the event (n8n polls every 60s).
- Each run uses a unique timestamped email to avoid deduplication conflicts.
- If the test fails at step 6 (PostgreSQL poll), the landing form is not submitting correctly.
- If it fails at step 7 (sync log), check n8n execution logs at http://localhost:5678.
- If it fails at step 8 (Odoo), check that the CRM module is installed and the n8n Odoo credential is correct.
