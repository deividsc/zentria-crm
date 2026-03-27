# Supabase Configuration

## Estructura

```
supabase/
├── migrations/           # Archivos SQL de migraciones
│   ├── 001_create_leads_tables.sql
│   ├── 002_create_events_and_logs.sql
│   ├── 003_create_triggers.sql
│   ├── 004_setup_rls.sql
│   └── 005_create_api_functions.sql
├── deploy.sh            # Script de deployment
├── metadata.json         # Metadata del schema
└── .env                 # Configuración local
```

## Deployment

### Opción 1: Supabase CLI (recomendado)

```bash
# Instalar Supabase CLI
brew install supabase/tap/supabase

# Link al proyecto
supabase link --project-ref jfoqucsjrzsoxhbepowk

# Push migraciones
supabase db push
```

### Opción 2: Script manual

```bash
# Asegurate de tener psql instalado
brew install postgresql

# Ejecutar migraciones
./deploy.sh
```

## API Endpoints

### Crear Lead
```bash
curl -X POST "https://jfoqucsjrzsoxhbepowk.supabase.co/rest/v1/rpc/create_lead" \
  -H "apikey: sb_publishable_vFGanpC49Qv9tQKO7YsNZA_bBLQRH4p" \
  -H "Content-Type: application/json" \
  -d '{"lead_data": {"email": "test@example.com", "name": "Juan Pérez"}}'
```

### Obtener Leads
```bash
curl "https://jfoqucsjrzsoxhbepowk.supabase.co/rest/v1/leads?select=*" \
  -H "apikey: sb_publishable_vFGanpC49Qv9tQKO7YsNZA_bBLQRH4p"
```

## Tables

| Table | Description |
|-------|-------------|
| leads | Leads capturados desde landings |
| lead_events | Eventos de tracking |
| sync_logs | Logs de sincronización con Odoo |

## Functions

| Function | Description |
|----------|-------------|
| create_lead | Crea/actualiza lead |
| create_lead_event | Registra evento |
| get_unsynced_leads | Obtiene leads pendientes |
| mark_leads_synced | Marca leads como sincronizados |
