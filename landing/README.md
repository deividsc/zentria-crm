# Zentria Landing Page

Landing page estática para capturar leads y mostrar servicios.

## Estructura

```
landing/
├── index.html
└── js/
    ├── sdk.iife.js               # SDK compilado (git-ignored, se genera desde /sdk)
    ├── zentria-config.js         # Config activa (git-ignored — nunca commitear)
    ├── zentria-config.local.js   # Template local dev (git-ignored)
    └── zentria-config.example.js # Template producción (commiteado, sin valores reales)
```

## Setup por ambiente

### Local (dev)

```bash
cp landing/js/zentria-config.local.js landing/js/zentria-config.js
```

Valores por defecto en `zentria-config.local.js`:
- `endpoint` → `http://localhost:3000` (backend API)
- `webhookUrl` → `http://localhost:5678/webhook/lead-webform` (n8n)
- `webhookToken` → `zentria-test-token-2026`
- `debug` → `true`

### Producción

```bash
cp landing/js/zentria-config.example.js landing/js/zentria-config.js
# Editar zentria-config.js con los valores reales del servidor
```

Completar en `zentria-config.js`:
- `endpoint` → URL pública del backend
- `webhookUrl` → URL pública de n8n
- `webhookToken` → token secreto de producción
- `debug` → `false`

## Levantar en local

```bash
# Python
python -m http.server 8082 --directory landing/

# Node
npx serve landing/ -p 8082
```

Abre en: `http://localhost:8082`

## n8n — activar el webhook

Para que el form funcione en local, el workflow `lead-webform` en n8n tiene que estar **activado** (toggle ON en `http://localhost:5678`).

- URL test (manual): `http://localhost:5678/webhook-test/lead-webform`
- URL prod/activa:   `http://localhost:5678/webhook/lead-webform` ← la que usa la config

## Stack completo

| Servicio | Local           | Producción              |
|----------|----------------|-------------------------|
| Landing  | localhost:8082  | dominio público         |
| Backend  | localhost:3000  | dominio público         |
| n8n      | localhost:5678  | dominio público         |
| Postgres | localhost:5433  | servidor VPS            |
| Odoo     | localhost:8069  | test-zentria.odoo.com   |
