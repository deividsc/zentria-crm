-- ===========================================
-- Migration: 005_create_api_functions
-- Created: 2026-03-27
-- Description: Funciones API para crear leads desde webhooks
-- ===========================================

-- Función para crear/actualizar lead
CREATE OR REPLACE FUNCTION public.create_lead(lead_data JSONB)
RETURNS leads AS $$
DECLARE
    new_lead leads;
BEGIN
    INSERT INTO leads (
        email, name, phone, company, source,
        utm_source, utm_medium, utm_campaign,
        form_data, metadata, page_visited,
        ip_address, user_agent
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
        lead_data->'metadata',
        lead_data->>'page_visited',
        (lead_data->>'ip_address')::INET,
        lead_data->>'user_agent'
    )
    ON CONFLICT (email) DO UPDATE SET
        name = COALESCE(lead_data->>'name', leads.name),
        phone = COALESCE(lead_data->>'phone', leads.phone),
        company = COALESCE(lead_data->>'company', leads.company),
        utm_source = COALESCE(lead_data->>'utm_source', leads.utm_source),
        utm_medium = COALESCE(lead_data->>'utm_medium', leads.utm_medium),
        utm_campaign = COALESCE(lead_data->>'utm_campaign', leads.utm_campaign),
        metadata = lead_data->'metadata',
        updated_at = NOW()
    RETURNING * INTO new_lead;
    
    RETURN new_lead;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para registrar evento
CREATE OR REPLACE FUNCTION public.create_lead_event(
    p_lead_id UUID,
    p_event_type VARCHAR(50),
    p_event_data JSONB DEFAULT NULL,
    p_page_url VARCHAR(500) DEFAULT NULL
)
RETURNS lead_events AS $$
DECLARE
    new_event lead_events;
BEGIN
    INSERT INTO lead_events (lead_id, event_type, event_data, page_url)
    VALUES (p_lead_id, p_event_type, p_event_data, p_page_url)
    RETURNING * INTO new_event;
    
    RETURN new_event;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener leads no sincronizados
CREATE OR REPLACE FUNCTION public.get_unsynced_leads()
RETURNS SETOF leads AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM leads
    WHERE synced = false
    ORDER BY created_at ASC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para marcar leads como sincronizados
CREATE OR REPLACE FUNCTION public.mark_leads_synced(
    lead_ids UUID[],
    p_odoo_lead_id INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE leads
    SET synced = true,
        odoo_lead_id = COALESCE(p_odoo_lead_id, odoo_lead_id)
    WHERE id = ANY(lead_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para registrar log de sincronización
CREATE OR REPLACE FUNCTION public.create_sync_log(
    p_source VARCHAR(50),
    p_records_processed INTEGER DEFAULT 0,
    p_records_success INTEGER DEFAULT 0,
    p_records_failed INTEGER DEFAULT 0,
    p_error_message TEXT DEFAULT NULL
)
RETURNS sync_logs AS $$
DECLARE
    new_log sync_logs;
BEGIN
    INSERT INTO sync_logs (
        source, records_processed, records_success,
        records_failed, error_message, completed_at
    )
    VALUES (
        p_source, p_records_processed, p_records_success,
        p_records_failed, p_error_message, NOW()
    )
    RETURNING * INTO new_log;
    
    RETURN new_log;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos para funciones
GRANT EXECUTE ON FUNCTION public.create_lead(JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.create_lead(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_lead(JSONB) TO service_role;

GRANT EXECUTE ON FUNCTION public.create_lead_event(UUID, VARCHAR, JSONB, VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION public.create_lead_event(UUID, VARCHAR, JSONB, VARCHAR) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_unsynced_leads() TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_leads_synced(UUID[], INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_sync_log(VARCHAR, INTEGER, INTEGER, INTEGER, TEXT) TO service_role;
