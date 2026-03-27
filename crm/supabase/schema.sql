# Configuración de Supabase para Zentria

## Schema Inicial

### Tabla: leads_external

Almacena leads que vienen de las landings vía n8n (futuro).

```sql
-- Tabla principal de leads
CREATE TABLE leads_external (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    name VARCHAR(255),
    company VARCHAR(255),
    source VARCHAR(100), -- 'landing_1', 'landing_2', etc.
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
    odoo_lead_id INTEGER, -- FK a Odoo
    synced BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para queries frecuentes
CREATE INDEX idx_leads_email ON leads_external(email);
CREATE INDEX idx_leads_source ON leads_external(source);
CREATE INDEX idx_leads_created ON leads_external(created_at DESC);
CREATE INDEX idx_leads_unsynced ON leads_external(synced) WHERE synced = false;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_external_updated_at
    BEFORE UPDATE ON leads_external
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Tabla: events (tracking de comportamiento)
CREATE TABLE lead_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads_external(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'page_view', 'scroll', 'click', 'form_submit'
    event_data JSONB,
    page_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_lead ON lead_events(lead_id);
CREATE INDEX idx_events_type ON lead_events(event_type);
CREATE INDEX idx_events_created ON lead_events(created_at DESC);

-- Tabla: integrations (logs de sincronización)
CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(50) NOT NULL, -- 'supabase_to_odoo', 'odoo_to_supabase'
    records_processed INTEGER,
    records_success INTEGER,
    records_failed INTEGER,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Políticas RLS (Row Level Security)
ALTER TABLE leads_external ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Políticas públicas para escritura (n8n necesita insertar)
CREATE POLICY "n8n can insert leads" ON leads_external
    FOR INSERT WITH CHECK (true);

CREATE POLICY "n8n can insert events" ON lead_events
    FOR INSERT WITH CHECK (true);

-- Políticas para lectura
CREATE POLICY "odoo can read leads" ON leads_external
    FOR SELECT USING (true);

CREATE POLICY "service role full access" ON leads_external
    FOR ALL USING (auth.role() = 'service_role');
```

## API Endpoints

### POST /webhooks/leads
Recibe leads de n8n.

```bash
curl -X POST https://your-project.supabase.co/functions/v1/webhooks/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "email": "test@example.com",
    "name": "Juan Pérez",
    "phone": "+5491112345678",
    "source": "landing_servicios",
    "utm_source": "google",
    "utm_campaign": "campaing_2024"
  }'
```

## Variables de Entorno en Supabase

```bash
# En Dashboard > Settings > Edge Functions
SUPABASE_DB_PASSWORD=xxx
ODOO_URL=https://tu-odoo.com
ODOO_API_KEY=xxx
```

## Row Level Security (RLS) Quick Reference

| Tabla | Operación | Quién | Condición |
|-------|-----------|-------|-----------|
| leads_external | INSERT | anon/service_role |任何人 |
| leads_external | SELECT | service_role | siempre |
| lead_events | INSERT | anon |任何人 |
| lead_events | SELECT | service_role | siempre |

## Backup Strategy

```bash
# Backup manual
pg_dump -h db.your-project.supabase.co -U postgres -d postgres > backup.sql

# Configurar en Supabase Dashboard > Database > Backups
# Backups automáticos diarios, retención 7 días (plan Pro)
```

## Monitoreo

### Dashboard
- Supabase Dashboard > Logs
- Supabase Dashboard > Database > Replication (si aplica)

### Alertas Sugeridas
- Uso de disco > 80%
- Tiempo de query > 1s
- Errores de conexión > 10/min

---

**Nota:** Esta configuración es para la fase inicial. A medida que crezca el proyecto, se pueden agregar:
- Realtime subscriptions para sincronización live
- PostgREST para API automática
- Edge Functions para lógica compleja
