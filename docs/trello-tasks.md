#zentria-odoo-mvp

## Fase 1: Infrastructure Setup
- [ ] 1.1 Crear cuenta GCP y configurar billing
- [ ] 1.2 Crear VM en GCP (e2-medium, Ubuntu 22.04)
- [ ] 1.3 Configurar firewall (puertos 80, 443, 8069)
- [ ] 1.4 Instalar Docker en la VM
- [ ] 1.5 Configurar dominio y DNS (opcional)
- [ ] 1.6 Instalar SSL con Let's Encrypt (opcional)

## Fase 2: Odoo Deployment
- [ ] 2.1 Crear docker-compose.yml con servicios
- [ ] 2.2 Configurar PostgreSQL
- [ ] 2.3 Desplegar contenedor Odoo
- [ ] 2.4 Configurar Nginx como reverse proxy
- [ ] 2.5 Verificar acceso a Odoo (http://IP:8069)

## Fase 3: Odoo Initial Setup
- [ ] 3.1 Crear base de datos Zentria
- [ ] 3.2 Instalar módulos core: CRM, Contactos, Ventas
- [ ] 3.3 Configurar idioma español
- [ ] 3.4 Configurar company info
- [ ] 3.5 Crear usuarios del equipo
- [ ] 3.6 Configurar email saliente (SMTP)

## Fase 4: CRM Configuration
- [ ] 4.1 Configurar pipeline de ventas
  - [ ] New → Contacted → Qualified → Proposal → Won/Lost
- [ ] 4.2 Crear campos custom para leads
- [ ] 4.3 Configurar tags por tipo de cliente
- [ ] 4.4 Configurar reglas de automatización (auto-assign, reminders)
- [ ] 4.5 Configurar vistas kanban, list, graph

## Fase 5: Supabase Integration
- [ ] 5.1 Crear proyecto en Supabase
- [ ] 5.2 Ejecutar schema.sql (tablas leads_external, lead_events)
- [ ] 5.3 Configurar Row Level Security (RLS)
- [ ] 5.4 Crear API endpoint para webhooks
- [ ] 5.5 Conectar Supabase con Odoo (crear módulo custom)

## Fase 6: Workflow Testing
- [ ] 6.1 Test: Crear lead manual en Odoo
- [ ] 6.2 Test: Enviar lead vía API
- [ ] 6.3 Test: Verificar sincronización Supabase ↔ Odoo
- [ ] 6.4 Test: Automation rules (auto-assign, stage changes)

## Fase 7: Go Live
- [ ] 7.1 Configurar backup automático
- [ ] 7.2 Documentar proceso de deploy
- [ ] 7.3 Training inicial del equipo
- [ ] 7.4 Primera landing conectada al sistema
