-- 003_odoo_sync_log.sql
-- Creates the odoo_sync_log table for tracking the Odoo lead ingestion pipeline.
-- Also creates least-privilege roles for n8n reader and writer access.

CREATE TABLE IF NOT EXISTS odoo_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(64) UNIQUE NOT NULL,
  odoo_lead_id INTEGER,
  email VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_odoo_sync_log_email ON odoo_sync_log(email);
CREATE INDEX IF NOT EXISTS idx_odoo_sync_log_status ON odoo_sync_log(status);

-- n8n reader: SELECT only on tracking tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'n8n_reader') THEN
    CREATE ROLE n8n_reader LOGIN PASSWORD 'PLACEHOLDER_READER_PW';
  END IF;
END
$$;
GRANT SELECT ON events, sessions, anonymous_profiles TO n8n_reader;
GRANT SELECT, INSERT, UPDATE ON odoo_sync_log TO n8n_reader;

-- n8n writer: INSERT/UPDATE on sync log only
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'n8n_writer') THEN
    CREATE ROLE n8n_writer LOGIN PASSWORD 'PLACEHOLDER_WRITER_PW';
  END IF;
END
$$;
GRANT SELECT, INSERT, UPDATE ON odoo_sync_log TO n8n_writer;
