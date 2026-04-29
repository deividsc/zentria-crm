# Zentria CRM

CRM como servicio basado en Odoo Community + Supabase para gestión de leads y clientes.

## Getting Started

### Prerequisites
- Docker and Docker Compose installed
- Create the shared network (one-time):
  ```
  docker network create zentria-net
  ```

### Start the tracking stack
```
docker compose up -d
```

### Start the Odoo + n8n stack
```
docker compose -f docker-compose.odoo.yml up -d
```

Odoo is available at http://localhost:8069
n8n is available at http://localhost:5678

## Stack Tecnológico

| Componente | Tecnología | Propósito |
|------------|------------|-----------|
| CRM | Odoo Community 17 | Gestión de leads, contactos, pipelines |
| Database | Supabase | Base de datos complementaria |
| Deployment | GCP (Compute Engine) | Servidor on-premise |
| Task Management | Trello | Roadmap y gestión de tareas |

## Estructura

```
zentria-crm/
├── crm/
│   ├── odoo/              # Configuración de Odoo
│   └── supabase/          # Schema y migraciones de Supabase
│       ├── migrations/     # Archivos de migración SQL
│       ├── deploy.sh       # Script de deployment
│       └── metadata.json   # Metadata del schema
├── docs/
│   ├── setup/             # Guías de instalación
│   ├── api/               # Documentación de APIs
│   └── adr/               # Architecture Decision Records
└── README.md
```

## Deployment Rápido

### 1. Supabase (ejecutar migraciones)

```bash
cd crm/supabase
./deploy.sh
```

### 2. Odoo

Ver `docs/setup/odoo-gcp-deployment.md`

## Recursos

- **Trello Board**: https://trello.com/b/Ubc9FwJL/zentria-mvp
- **Odoo**: http://136.115.7.41:8069
- **Supabase**: https://jfoqucsjrzsoxhbepowk.supabase.co

## Enlaces

- [Guía de Setup](./docs/setup/)
- [Documentación Supabase](./crm/supabase/)
- [ADR](./docs/adr/)
