# Zentria CRM

CRM basado en Odoo Community + Supabase para gestión de leads y clientes.

## Stack Tecnológico

| Componente | Tecnología | Propósito |
|------------|------------|-----------|
| CRM | Odoo Community 17 | Gestión de leads, contactos, pipelines |
| Database | Supabase | Base de datos complementaria |
| Deployment | GCP (Compute Engine) | Servidor on-premise |
| Task Management | Trello | Roadmap y gestión de tareas |

## Estructura

```
├── crm/
│   ├── odoo/            # Configuración de Odoo
│   └── supabase/        # Schema de base de datos
└── docs/
    ├── setup/           # Guías de instalación
    ├── api/             # Documentación de APIs
    └── adr/             # Architecture Decision Records
```

## Quick Start

### 1. Odoo Setup
Ver `docs/setup/odoo-gcp-deployment.md`

### 2. Supabase Schema
```bash
cd crm/supabase
# Ejecutar migrations en Supabase Dashboard
```

## Recursos

- [Guía de Setup](./docs/setup/)
- [API Documentation](./docs/api/)
- [ADR](./docs/adr/)
- [Trello Board](https://trello.com/b/Ubc9FwJL/zentria-mvp)
