-- ===========================================
-- Migration: 004_setup_rls
-- Created: 2026-03-27
-- Description: Configuración de Row Level Security
-- ===========================================

-- Habilitar RLS en todas las tablas
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para leads
DROP POLICY IF EXISTS "Allow anon insert leads" ON leads;
CREATE POLICY "Allow anon insert leads" ON leads
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update leads" ON leads;
CREATE POLICY "Allow anon update leads" ON leads
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow service role read leads" ON leads;
CREATE POLICY "Allow service role read leads" ON leads
    FOR SELECT USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Allow service role all leads" ON leads;
CREATE POLICY "Allow service role all leads" ON leads
    FOR ALL USING (auth.role() = 'service_role');

-- Políticas para lead_events
DROP POLICY IF EXISTS "Allow anon insert events" ON lead_events;
CREATE POLICY "Allow anon insert events" ON lead_events
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service role read events" ON lead_events;
CREATE POLICY "Allow service role read events" ON lead_events
    FOR SELECT USING (auth.role() = 'service_role');

-- Políticas para sync_logs
DROP POLICY IF EXISTS "Allow service role all sync_logs" ON sync_logs;
CREATE POLICY "Allow service role all sync_logs" ON sync_logs
    FOR ALL USING (auth.role() = 'service_role');
