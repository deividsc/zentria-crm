-- ===========================================
-- Migration: 003_create_triggers
-- Created: 2026-03-27
-- Description: Triggers automáticos para updated_at
-- ===========================================

-- Trigger para actualizar updated_at en leads
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
