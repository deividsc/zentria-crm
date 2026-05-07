-- 005_security.sql
-- Adds api_keys table (origin whitelist per customer) and risk scoring columns to odoo_sync_log.

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  allowed_origins TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);

-- Seed the existing dev key with localhost origins so nothing breaks locally
INSERT INTO api_keys (key, customer_name, allowed_origins)
VALUES (
  'zt_live_dev',
  'Zentria Dev',
  ARRAY['http://localhost:8082', 'http://localhost:3000', 'http://127.0.0.1:8082']
)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE odoo_sync_log
  ADD COLUMN IF NOT EXISTS risk_score INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS risk_flags TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS risk_score INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS risk_flags TEXT[] NOT NULL DEFAULT '{}';

GRANT SELECT ON api_keys TO n8n_reader;
GRANT SELECT ON api_keys TO n8n_writer;
