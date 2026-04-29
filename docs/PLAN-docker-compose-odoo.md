# PLAN: Zentria CRM - Docker Compose con Odoo + PostgreSQL Local

## Objetivo

Crear un nuevo repositorio `zentria-local` con Docker Compose para tener **Odoo + PostgreSQL** funcionando 100% en local.

---

## 1. Estructura del Proyecto

```
zentria-local/
├── docker-compose.yml          # Orquestación de servicios
├── .env                        # Variables de entorno (NO commitear)
├── .env.example                # Template de variables
├── .gitignore
│
├── odoo/
│   ├── Dockerfile              # Odoo customizado
│   ├── config/
│   │   └── odoo.conf          # Configuración Odoo
│   └── addons/
│       ├── custom_crm/         # Módulo CRM customizado
│       └── lead_tracker/       # Módulo tracking leads
│
├── postgres/
│   └── init-scripts/
│       ├── 001_init.sql        # Schema inicial
│       └── 002_seed.sql        # Datos de prueba
│
├── nginx/
│   └── nginx.conf              # Reverse proxy
│
└── scripts/
    ├── start.sh               # Script de inicio
    ├── stop.sh                 # Script de parada
    ├── backup.sh               # Backup de DB
    └── restore.sh              # Restaurar DB
```

---

## 2. Servicios Docker

| Servicio | Imagen | Puerto | Descripción |
|----------|--------|--------|-------------|
| **postgres** | postgres:16 | 5432 | Base de datos |
| **odoo** | custom (Dockerfile) | 8069 | Aplicación Odoo |
| **nginx** | nginx:alpine | 80/443 | Reverse proxy |

---

## 3. Configuración de Servicios

### 3.1 PostgreSQL

```yaml
postgres:
  image: postgres:16-alpine
  environment:
    POSTGRES_DB: zentria
    POSTGRES_USER: odoo
    POSTGRES_PASSWORD: ${DB_PASSWORD}
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./postgres/init-scripts:/docker-entrypoint-initdb.d
  ports:
    - "5432:5432"
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U odoo -d zentria"]
```

### 3.2 Odoo

```yaml
odoo:
  build:
    context: ./odoo
    dockerfile: Dockerfile
  depends_on:
    postgres:
      condition: service_healthy
  environment:
    HOST: postgres
    PORT: 5432
    USER: odoo
    PASSWORD: ${DB_PASSWORD}
    DATABASE: zentria
  volumes:
    - odoo_data:/var/lib/odoo
    - ./odoo/addons:/mnt/extra-addons
    - ./odoo/config:/etc/odoo/conf.d
  ports:
    - "8069:8069"
  healthcheck:
    test: ["CMD", "wget", "-q", "http://localhost:8069/health"]
```

### 3.3 Nginx

```yaml
nginx:
  image: nginx:alpine
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
  ports:
    - "80:80"
    - "443:443"
  depends_on:
    - odoo
```

---

## 4. Variables de Entorno (.env)

```bash
# Database
DB_PASSWORD=zentria_secure_password_2024

# Odoo
ODOO_MASTER_PASSWORD=zentria_master_password

# Puertos (para referencia)
ODOO_PORT=8069
POSTGRES_PORT=5432
NGINX_HTTP=80
NGINX_HTTPS=443
```

---

## 5. Schema PostgreSQL

### Tabla de Leads (complementaria a Odoo)

```sql
-- Extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de leads capturados
CREATE TABLE IF NOT EXISTS zentria_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Datos de contacto
    name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    company VARCHAR(255),
    
    -- Source tracking
    source VARCHAR(100),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(255),
    utm_content VARCHAR(255),
    landing_url VARCHAR(500),
    
    -- Comportamiento
    page_visited VARCHAR(500),
    scroll_depth INTEGER DEFAULT 0,
    time_on_page INTEGER DEFAULT 0,
    form_submitted BOOLEAN DEFAULT false,
    section_origin VARCHAR(100),
    
    -- Geolocalización
    ip_address INET,
    country VARCHAR(100),
    city VARCHAR(100),
    
    -- Sincronización con Odoo
    odoo_partner_id INTEGER,
    odoo_lead_id INTEGER,
    synced BOOLEAN DEFAULT false,
    synced_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_leads_email ON zentria_leads(email);
CREATE INDEX idx_leads_source ON zentria_leads(source);
CREATE INDEX idx_leads_created ON zentria_leads(created_at DESC);
CREATE INDEX idx_leads_unsynced ON zentria_leads(synced) WHERE synced = false;

-- Tabla de eventos (tracking)
CREATE TABLE IF NOT EXISTS zentria_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES zentria_leads(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_lead ON zentria_events(lead_id);
CREATE INDEX idx_events_type ON zentria_events(event_type);
```

---

## 6. Módulos Odoo Custom

### 6.1 lead_tracker (Sincronización)

**Funcionalidades:**
- Sincronización bidireccional con tabla `zentria_leads`
- Webhook para recibir leads del tracking
- Mapeo de campos a Odoo CRM
- Logging de sincronización

### 6.2 custom_crm (Extensiones)

**Funcionalidades:**
- Campos adicionales en crm.lead
- Vistas personalizadas
- Workflow de lead qualification
- Scoring básico

---

## 7. Scripts de Gestión

### 7.1 start.sh
```bash
#!/bin/bash
docker compose up -d
echo "Esperando a PostgreSQL..."
sleep 10
echo "Esperando a Odoo..."
sleep 15
echo "✅ Zentria CRM iniciado"
echo "Odoo: http://localhost:8069"
echo "DB: localhost:5432"
```

### 7.2 backup.sh
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker compose exec -T postgres pg_dump -U odoo zentria > "backups/zentria_${DATE}.sql"
echo "Backup guardado: backups/zentria_${DATE}.sql"
```

---

## 8. Flujo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                        LANDING PAGE                          │
│                   (forms + tracking.js)                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ POST /api/leads
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     NGINX (puerto 80)                       │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ reverse proxy
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────┐    ┌─────────────────────────────────┐   │
│  │  ODOO       │    │      NODE.JS API (futuro)       │   │
│  │  ( puerto   │    │      - Recibe leads              │   │
│  │   8069 )    │    │      - Valida datos             │   │
│  │             │    │      - Inserta en PostgreSQL     │   │
│  └──────┬──────┘    └───────────────┬─────────────────┘   │
│         │                           │                       │
│         │  XML-RPC                 │ INSERT               │
│         │◄──────────────────────────┘                     │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  POSTGRESQL                          │   │
│  │  - zentria_leads (leads capturados)                  │   │
│  │  - zentria_events (eventos tracking)                 │   │
│  │  - crm.lead (Odoo native)                           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Pasos de Implementación

### Fase 1: Docker Base
- [ ] Crear estructura de directorios
- [ ] Crear docker-compose.yml básico
- [ ] Configurar PostgreSQL con init scripts
- [ ] Probar que Odoo levanta y crea DB

### Fase 2: Odoo Config
- [ ] Dockerfile personalizado con addons
- [ ] Configuración odoo.conf
- [ ] Módulo lead_tracker básico
- [ ] Sincronización con PostgreSQL

### Fase 3: Nginx
- [ ] Configuración reverse proxy
- [ ] SSL (opcional para local)

### Fase 4: Scripts
- [ ] start.sh / stop.sh
- [ ] backup.sh / restore.sh
- [ ] README con instrucciones

### Fase 5: Testing
- [ ] Verificar landing captura leads
- [ ] Verificar leads llegan a PostgreSQL
- [ ] Verificar sincronización con Odoo
- [ ] Probar dashboard de leads

---

## 10. Requisitos del Sistema

- Docker 24.0+
- Docker Compose 2.20+
- 4GB RAM mínimo (recomendado 8GB)
- 20GB disco

---

## 11. URLs de Acceso

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| Odoo | http://localhost:8069 | Master: configurado en .env |
| PostgreSQL | localhost:5432 | User/Pass: .env |
| phpPgAdmin | http://localhost:5050 | (opcional) |

---

## 12. Tiempo Estimado

| Fase | Tiempo |
|------|--------|
| Docker Base | 1 hora |
| Odoo Config | 2 horas |
| Nginx | 30 min |
| Scripts | 30 min |
| Testing | 1 hora |
| **Total** | **~5 horas** |

---

## 13. Decisiones Pendientes

- [ ] ¿Usar Odoo 17 o 18?
- [ ] ¿phpPgAdmin para administración de DB?
- [ ] ¿Módulo Node.js API o Odoo XML-RPC directo?
- [ ] ¿Automatizar creación de DB en Odoo?

---

*Plan creado: 2026-04-08*
