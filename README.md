# Zentria CRM

Stack completo de captación y gestión de leads: SDK de tracking web, API de eventos, Odoo 17 como CRM y n8n como motor de automatización.

## Stack

| Componente | Tecnología | Propósito |
|---|---|---|
| Tracking SDK | TypeScript / Rollup | Captura eventos, identidad y formularios en el browser |
| Backend API | Node.js / Fastify | Recibe eventos del SDK, los persiste en Postgres |
| Base de datos tracking | PostgreSQL 16 | Almacena eventos, sesiones y log de sync con Odoo |
| Cache | Redis 7 | Buffer de eventos de alta frecuencia |
| CRM | Odoo Community 17 | Pipeline de leads, contactos, automatizaciones |
| Automatización | n8n | Workflow que convierte eventos en leads de Odoo |
| Deploy | GCP / Hetzner | Servidor de producción |

## Estructura

```
zentria-crm/
├── sdk/                        # Tracking SDK (TypeScript)
│   ├── src/
│   │   ├── index.ts            # Entry point, init y track()
│   │   ├── identity.ts         # anonymousId, knownId, leadId
│   │   ├── capture.ts          # Captura automática pageview, form_submit
│   │   ├── buffer.ts           # Queue de eventos
│   │   └── transport.ts        # Envío al backend
│   └── dist/sdk.iife.js        # Build listo para usar
├── backend/
│   └── src/server.ts           # API REST (Fastify)
├── landing/                    # Landing de demo con el SDK integrado
│   ├── index.html
│   └── js/
│       ├── sdk.iife.js         # SDK compilado
│       ├── zentria-config.js   # Config local (gitignored)
│       └── zentria-config.example.js
├── odoo/
│   ├── odoo.conf               # Config de Odoo (gitignored, tiene credenciales)
│   ├── odoo.conf.example       # Template
│   └── addons/                 # Custom addons
├── n8n-workflows/
│   └── odoo-lead-ingestion.json  # Workflow: eventos → leads en Odoo
├── scripts/
│   └── remote-setup.sh         # Setup remoto ejecutado en la VM
├── docs/
│   ├── migration-gcp-to-hetzner.md  # Guía de migración a Hetzner
│   └── tracking-sdk-test-guide.*    # Guía de testing E2E
├── docker-compose.yml          # Stack tracking: postgres + redis + api
├── docker-compose.odoo.yml     # Stack CRM: odoo + n8n + sus postgres
├── deploy-to-gcp.sh            # Deploy a GCP via gcloud + SSH
└── .env.example                # Variables de entorno requeridas
```

## Setup local

### Requisitos

- Docker y Docker Compose
- Node.js 20+
- gcloud CLI (solo para deploy a GCP)

### 1. Variables de entorno

```bash
cp .env.example .env
# Editar .env con los valores correspondientes
```

### 2. Config del SDK para local

```bash
cp landing/js/zentria-config.example.js landing/js/zentria-config.js
# zentria-config.js ya tiene endpoint: http://localhost:3000 por defecto
```

### 3. Build del SDK

```bash
cd sdk && npm ci && npm run build
cp dist/sdk.iife.js ../landing/js/sdk.iife.js
```

### 4. Red compartida (una sola vez)

```bash
docker network create zentria-net
```

### 5. Stack de tracking

```bash
docker compose up -d
```

Servicios levantados:
- API: `http://localhost:3000`
- Postgres tracking: `localhost:5433`
- Redis: `localhost:6379`

### 6. Stack Odoo + n8n

```bash
docker compose -f docker-compose.odoo.yml up -d
```

Servicios levantados:
- Odoo: `http://localhost:8069`
- n8n: `http://localhost:5678`

### 7. Inicializar Odoo (primera vez)

```bash
# Inicializar base + CRM
docker compose -f docker-compose.odoo.yml stop odoo
docker run --rm \
  --network zentria-crm_odoo-internal \
  -e HOST=odoo-postgres -e USER=odoo -e PASSWORD=<ODOO_DB_PASSWORD> \
  -v zentria-crm_odoo_data:/var/lib/odoo \
  -v ./odoo/addons:/mnt/extra-addons \
  -v ./odoo/odoo.conf:/etc/odoo/odoo.conf:ro \
  odoo:17.0 odoo -d odoo --init crm,contacts,mail --stop-after-init
docker compose -f docker-compose.odoo.yml start odoo
```

Login: `admin` / `admin`

## Deploy a producción

### GCP (actual)

```bash
# Requiere gcloud autenticado y .env + landing/js/zentria-config.js presentes
./deploy-to-gcp.sh
```

El script:
1. Buildea el SDK localmente
2. Transfiere el proyecto a la VM via `tar | gcloud compute ssh`
3. Ejecuta `scripts/remote-setup.sh` en la VM (limpia containers, levanta stacks)

VM actual: `odoo-zentria-eu` · `104.199.28.87` · `europe-west1-b` · proyecto `zentria-crm`

### Hetzner (migración planeada)

Ver `docs/migration-gcp-to-hetzner.md`.

Plan recomendado: **CX32** (4 vCPU / 8 GB / 80 GB / €6.80/mes).

## URLs de producción (GCP)

| Servicio | URL |
|---|---|
| Backend API | http://104.199.28.87:3000/health |
| Odoo CRM | http://104.199.28.87:8069 |
| n8n | http://104.199.28.87:5678 |

## Workflow n8n — Odoo Lead Ingestion

Corre cada 5 segundos. Flujo:

```
events (identity_linked) → normalizar email → crear lead en Odoo → log sync
```

Importar en n8n desde `n8n-workflows/odoo-lead-ingestion.json`.
Credenciales requeridas: `Postgres Reader` y `Postgres Writer` apuntando a `zentria-postgres:5432` / DB `zentria_tracking`.

## Variables de entorno relevantes

| Variable | Descripción |
|---|---|
| `DB_NAME` | Nombre de la DB de tracking (`zentria_tracking`) |
| `DB_USER` / `DB_PASSWORD` | Credenciales de la DB de tracking |
| `ODOO_DB_PASSWORD` | Password de la DB de Odoo |
| `N8N_BASIC_AUTH_USER` / `N8N_BASIC_AUTH_PASSWORD` | Auth de n8n |
| `N8N_ENCRYPTION_KEY` | Clave de cifrado de n8n (32 chars hex) |
| `CORS_ORIGIN` | Origen(es) permitidos en la API (vacío = todos) |

Ver `.env.example` para la lista completa.
