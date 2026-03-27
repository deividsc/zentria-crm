-- ===========================================
-- Zentria CRM - Supabase Schema
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_unsynced ON leads(synced) WHERE synced = false;

-- Trigger para updated_at
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

-- Habilitar RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para escritura (n8n/API)
DROP POLICY IF EXISTS "Allow anon insert leads" ON leads;
CREATE POLICY "Allow anon insert leads" ON leads
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon insert events" ON lead_events;
CREATE POLICY "Allow anon insert events" ON lead_events
    FOR INSERT WITH CHECK (true);

-- Políticas para lectura (service role)
DROP POLICY IF EXISTS "Allow service role read" ON leads;
CREATE POLICY "Allow service role read" ON leads
    FOR SELECT USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Allow service role all" ON leads;
CREATE POLICY "Allow service role all" ON leads
    FOR ALL USING (auth.role() = 'service_role');

-- Función para crear lead desde webhook
CREATE OR REPLACE FUNCTION public.create_lead(lead_data JSONB)
RETURNS leads AS $$
DECLARE
    new_lead leads;
BEGIN
    INSERT INTO leads (
        email, name, phone, company, source,
        utm_source, utm_medium, utm_campaign,
        form_data, metadata
    )
    VALUES (
        lead_data->>'email',
        lead_data->>'name',
        lead_data->>'phone',
        lead_data->>'company',
        lead_data->>'source',
        lead_data->>'utm_source',
        lead_data->>'utm_medium',
        lead_data->>'utm_campaign',
        lead_data->'form_data',
        lead_data->'metadata'
    )
    ON CONFLICT (email) DO UPDATE SET
        name = COALESCE(lead_data->>'name', leads.name),
        phone = COALESCE(lead_data->>'phone', leads.phone),
        metadata = lead_data->'metadata'
    RETURNING * INTO new_lead;
    
    RETURN new_lead;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permitir acceso a la función
GRANT EXECUTE ON FUNCTION public.create_lead(JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.create_lead(JSONB) TO authenticated;
