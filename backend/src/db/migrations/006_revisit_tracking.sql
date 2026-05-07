-- Track returning visitors: how many times a lead has resubmitted and when last seen
ALTER TABLE odoo_sync_log
  ADD COLUMN IF NOT EXISTS revisit_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_submission_at TIMESTAMPTZ;
