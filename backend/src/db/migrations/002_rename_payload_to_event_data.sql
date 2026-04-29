-- 002_rename_payload_to_event_data.sql
-- Rename the `payload` column in the events table to `event_data`.
-- NOTE: The initial migration (001_init.sql) already creates the column
-- as `event_data`, so this migration is a no-op on fresh volumes.
-- It is retained for environments where the column was previously created
-- under the `payload` name (pre-init schema).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'events'
      AND column_name = 'payload'
  ) THEN
    ALTER TABLE events RENAME COLUMN payload TO event_data;
  END IF;
END
$$;
