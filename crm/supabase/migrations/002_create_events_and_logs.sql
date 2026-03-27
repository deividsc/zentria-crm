-- ===========================================
-- Migration: 002_create_events_and_logs
-- Created: 2026-03-27
-- Description: Tablas de eventos y logs de sincronización
-- ===========================================

-- Tabla de eventos de tracking
CREATE TABLE IF NOT EXISTS lead_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    page_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_lead ON lead_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON lead_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON lead_events(created_at DESC);

-- Tabla de logs de sincronización
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(50) NOT NULL,
    records_processed INTEGER,
    records_success INTEGER,
    records_failed INTEGER,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_source ON sync_logs(source);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started ON sync_logs(started_at DESC);
