-- ===========================================
-- Migration: 001_create_leads_tables
-- Created: 2026-03-27
-- Description: Tablas principales para tracking de leads
-- ===========================================

-- Tabla principal de leads
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    name VARCHAR(255),
    company VARCHAR(255),
    source VARCHAR(100),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(255),
    utm_content VARCHAR(255),
    utm_term VARCHAR(255),
    page_visited VARCHAR(500),
    scroll_depth INTEGER DEFAULT 0,
    time_on_page INTEGER DEFAULT 0,
    form_submitted BOOLEAN DEFAULT false,
    form_data JSONB,
    ip_address INET,
    user_agent TEXT,
    country VARCHAR(100),
    city VARCHAR(100),
    metadata JSONB,
    odoo_lead_id INTEGER,
    synced BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para leads
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_unsynced ON leads(synced) WHERE synced = false;
CREATE INDEX IF NOT EXISTS idx_leads_odoo_id ON leads(odoo_lead_id) WHERE odoo_lead_id IS NOT NULL;
