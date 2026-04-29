# PLAN: Zentria Local - Odoo CRM con Docker Compose

## Objetivo

Levantar **Odoo 17 + PostgreSQL** en local via Docker Compose para que n8n pueda enviar leads al CRM.

---

## 1. Estructura del Proyecto

```
zentria-local/
├── docker-compose.yml          # Odoo + PostgreSQL
├── .env                       # Contraseñas (NO commitear)
├── .env.example              # Template para compartir
├── .gitignore
└── README.md                  # Instrucciones
```

**Solo 4 archivos. Sin custom modules, sin nginx, sin scripts.** 

n8n ya hace todo el trabajo de integración.

---

## 2. docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: zentria-postgres
    environment:
      POSTGRES_DB: crm-data
      POSTGRES_USER: odoo
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U odoo -d crm-data"]
      interval: 10s
      timeout: 5s
      retries: 5

  odoo:
    image: odoo:17
    container_name: zentria-odoo
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      HOST: postgres
      PORT: 5432
      USER: odoo
      PASSWORD: ${DB_PASSWORD}
      DATABASE: crm-data
    volumes:
      - odoo_data:/var/lib/odoo
      - ./odoo/addons:/mnt/extra-addons
    ports:
      - "8069:8069"
    healthcheck:
      test: ["CMD", "wget", "-q", "http://localhost:8069/health"]
      interval: 30s
      timeout: 10s
      retries: 5

volumes:
  postgres_data:
  odoo_data:
```

---

## 3. .env

```bash
# Contraseña de la base de datos PostgreSQL
DB_PASSWORD=zentria_secure_password_2024
```

---

## 4. .env.example

```bash
# Copiar a .env y cambiar la contraseña
DB_PASSWORD=TU_PASSWORD_AQUI
```

---

## 5. .gitignore

```gitignore
.env
*.log
```

---

## 6. Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│                        LANDING PAGE                          │
│                   (tracking.js + forms)                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ POST /api/leads
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                          N8N                                │
│              (n8n-workflow-lead-capture)                  │
│                                                             │
│   Webhook → Odoo XML-RPC → Crear Lead                     │
│          → Email Marketing → Enviar a lista                │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ XML-RPC
                          ▼
┌─────────────────────────────────────────────────────────────┐
│   ┌─────────────┐              ┌─────────────────────────┐ │
│   │  ODOO 17   │              │    POSTGRESQL 16        │ │
│   │  (port 8069)│              │    (port 5432)          │ │
│   │             │              │                         │ │
│   │  CRM Module │◄─────────────│  Database: crm-data     │ │
│   │             │   XML-RPC    │                         │ │
│   └─────────────┘              └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. URLs de Acceso

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| **Odoo** | http://localhost:8069 | Crear al primer acceso |
| **PostgreSQL** | localhost:5432 | User: `odoo` / Pass: `.env` |

---

## 8. Configuración Inicial Odoo

Al acceder a http://localhost:8069 por primera vez:

1. **Master Password:** `zentria_master_password` (o la que seteen)
2. **Database Name:** `crm-data`
3. **Email:** tu email
4. **Password:** contraseña admin
5. **Language:** Spanish
6. **Country:** Spain / Argentina

Luego instalar módulos:
- ✅ CRM
- ✅ Email Marketing (para newsletters)
- ✅ Contacts

---

## 9. Comandos

```bash
# Iniciar
docker compose up -d

# Ver logs
docker compose logs -f

# Ver logs de Odoo nomás
docker compose logs -f odoo

# Parar
docker compose down

# Parar y borrar datos
docker compose down -v

# Reiniciar
docker compose restart
```

---

## 10. Tiempo de Implementación

**~15 minutos** (es solo copiar archivos y levantar containers).

---

## 11. Checklist de Implementación

- [ ] Crear directorio
- [ ] Crear docker-compose.yml
- [ ] Crear .env
- [ ] Crear .env.example
- [ ] Crear .gitignore
- [ ] Crear README.md
- [ ] `docker compose up -d`
- [ ] Acceder a http://localhost:8069
- [ ] Crear DB `crm-data`
- [ ] Instalar módulos CRM + Email Marketing
- [ ] Configurar n8n para enviar leads

---

*Plan simplificado: 2026-04-08*
