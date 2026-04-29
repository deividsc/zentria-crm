# Zentria SaaS — Plataforma de Captación Inteligente para el Sector Educación

**Versión:** 1.0  
**Fecha:** 2026-04-06  
**Sector:** EdTech B2B — Empresas de Formación en España

---

## 1. Visión del Producto

Plataforma SaaS que permite a empresas de formación **conectar sus landings** a un ecosistema inteligente de captación. El sistema captura cada interacción del potencial cliente, la procesa con IA para calificación y scoring, y distribuye automáticamente al comercial correcto con toda la información contextualizada.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ZENTRIA SAAS — ARQUITECTURA GLOBAL                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────────┐  │
│  │   LANDING    │    │   LANDING    │    │         LANDING              │  │
│  │  Empresa A   │    │  Empresa B   │    │        Empresa N             │  │
│  └──────┬───────┘    └──────┬───────┘    └─────────────┬────────────────┘  │
│         │                   │                          │                     │
│         └───────────────────┼──────────────────────────┘                     │
│                             ▼                                                │
│                    ┌─────────────────┐                                       │
│                    │  TRACKING SDK   │ ◄── Pixel + Script injectado         │
│                    │  (Cliente)      │                                       │
│                    └────────┬────────┘                                       │
│                             │                                                │
│         ┌───────────────────┼───────────────────┐                            │
│         ▼                   ▼                   ▼                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                      │
│  │  Webhooks   │    │  WhatsApp   │    │   Email     │                      │
│  │  Eventos    │    │   Gateway   │    │  Tracking   │                      │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                      │
│         │                   │                   │                            │
│         └───────────────────┼───────────────────┘                            │
│                             ▼                                                │
│              ┌──────────────────────────────┐                                │
│              │     AGENTE ORQUESTADOR       │                                │
│              │  ┌────────────────────────┐ │                                │
│              │  │  Intent Classifier     │ │                                │
│              │  │  → Routing Engine      │ │                                │
│              │  │  → Context Aggregator  │ │                                │
│              │  └────────────────────────┘ │                                │
│              └──────────────┬───────────────┘                                │
│                             │                                                │
│         ┌───────────────────┼───────────────────┐                             │
│         ▼                   ▼                   ▼                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                      │
│  │  Funnel     │    │  Scoring    │    │  Assignment │                      │
│  │  Agent      │    │  Agent      │    │  Agent      │                      │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                      │
│         │                   │                   │                            │
│         └───────────────────┼───────────────────┘                             │
│                             ▼                                                │
│              ┌──────────────────────────────┐                                │
│              │         DATA LAYER           │                                │
│              │  ┌─────────┐ ┌────────────┐  │                                │
│              │  │ CRM     │ │ Data       │  │                                │
│              │  │ (Pipe)  │ │ Warehouse  │  │                                │
│              │  └─────────┘ └────────────┘  │                                │
│              └──────────────┬───────────────┘                                │
│                             │                                                │
│         ┌───────────────────┼───────────────────┐                             │
│         ▼                   ▼                   ▼                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                      │
│  │ Dashboard   │    │ Commercial  │    │  Marketing  │                      │
│  │ KPIs        │    │ App        │    │  Manager    │                      │
│  └─────────────┘    └─────────────┘    └─────────────┘                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Componentes del Sistema

### 2.1 Tracking SDK (Client-Side)

Script inyectable en landings de los clientes. Captura comportamiento anónimo y autenticado.

```
┌─────────────────────────────────────────────────────────────────┐
│                      TRACKING SDK                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Page View   │  │ Scroll      │  │ Time on Page            │ │
│  │ Tracker     │  │ Depth       │  │ Tracker                 │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ CTA Click   │  │ Form Focus  │  │ Abandonment             │ │
│  │ Tracker     │  │ Tracker     │  │ Detector                │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Identity Resolution: Anonymous ID → Known User (email/phone)││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Datos capturados:**
- `page_view`: URL, referrer, UTM params, tiempo de carga
- `scroll_depth`: 25%, 50%, 75%, 100%
- `cta_click`: Selector CSS, texto, posición
- `form_interaction`: Campos tocados, tiempo por campo, abandono
- `session_duration`: Tiempo total, paginas vistas
- `device_info`: User agent, resolución, timezone

### 2.2 WhatsApp Gateway (IA)

```
┌─────────────────────────────────────────────────────────────────┐
│                    WHATSAPP GATEWAY                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Cliente ──► WhatsApp ──► Twilio/360dialog ──► Webhook          │
│                           ◄────────────────                       │
│                                                                  │
│   ┌────────────────────────────────────────────────────────────┐ │
│   │                    CONVERSATIONAL AI                        │ │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │ │
│   │  │ Intent       │  │ Entity       │  │ Response        │  │ │
│   │  │ Detection    │  │ Extraction   │  │ Generator       │  │ │
│   │  └──────────────┘  └──────────────┘  └──────────────────┘  │ │
│   │                                                              │ │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │ │
│   │  │ FAQ Bot       │  │ Qualification│  │ Scheduling      │  │ │
│   │  │ (Preguntas   │  │ Flow         │  │ Assistant       │  │ │
│   │  │  frecuentes)  │  │              │  │                 │  │ │
│   │  └──────────────┘  └──────────────┘  └──────────────────┘  │ │
│   └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│   Context: ──► Orquestador ◄── Session History                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Capacidades:**
- Respuesta a preguntas frecuentes (catalogo de cursos, precios, horarios)
- Cualificación inicial (nivel de interés, presupuesto, timing)
- Agendar llamadas o demo
- Captura de datos de contacto
- Transferencia a humano con contexto completo

### 2.3 Agente Orquestador (Core del Sistema)

El cerebro central que recibe, procesa y rutea.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AGENTE ORQUESTADOR                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   INPUT: Cliente Data (multi-canal)                                         │
│   ├── WhatsApp message                                                      │
│   ├── Form submission (landing)                                            │
│   ├── Email interaction                                                     │
│   ├── Call back request                                                     │
│   └── Inbound call (voz → texto)                                           │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │  CONTEXT AGGREGATOR                                                   │    │
│   │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │    │
│   │  │ Session     │ │ Historical  │ │ Behavioral │ │ Firmographic│   │    │
│   │  │ Context     │ │ Data        │ │ Profile     │ │ Data        │   │    │
│   │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                     │                                        │
│                                     ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │  ROUTING ENGINE                                                       │    │
│   │                                                                       │    │
│   │   Si Canal = WhatsApp    → Funnel Agent                               │    │
│   │   Si Canal = Form        → Qualification Agent                        │    │
│   │   Si Canal = Email       → Nurture Agent                              │    │
│   │   Si Canal = Call        → High-Intent Agent                          │    │
│   │   Si Score > 80         → Priority Queue (Comercial ASAP)            │    │
│   │   Si Score 50-80        → Nurture Sequence                            │    │
│   │   Si Score < 50         → Lead Database (re-engagement)              │    │
│   │                                                                       │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                     │                                        │
│                                     ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │  OUTPUT: Structured Lead Object                                      │    │
│   │  ┌─────────────────────────────────────────────────────────────┐    │    │
│   │  │ {                                                              │    │    │
│   │  │   "lead_id": "uuid",                                          │    │    │
│   │  │   "contact": { name, email, phone, company },                 │    │    │
│   │  │   "score": 75,                                                │    │    │
│   │  │   "intent_level": "hot|warm|cold",                            │    │    │
│   │  │   "interests": ["curso-react", "modalidad-online"],            │    │    │
│   │  │   "budget_range": "2000-5000€",                               │    │    │
│   │  │   "timeline": "1-3-meses",                                    │    │    │
│   │  │   "assigned_commercial_id": "uuid",                           │    │    │
│   │  │   "crm_opportunity_id": "uuid",                               │    │    │
│   │  │   "next_action": "call|email|whatsapp|nurture",                │    │    │
│   │  │   "context_summary": "..."                                    │    │    │
│   │  │ }                                                             │    │
│   │  └─────────────────────────────────────────────────────────────┘    │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Agentes Especializados

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENTE FUNNEL                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Función: Clasificar al lead en etapa del funnel                │
│                                                                  │
│  ETAPAS:                                                        │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│  │ AWARENESS│───►│INTEREST  │───►│CONSIDER- │───►│DECISION  │ │
│  │          │    │          │    │ATION     │    │          │ │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│                                                                  │
│  Inputs:                                                        │
│  - Páginas visitadas                                           │
│  - Contenido consumido                                         │
│  - Interacciones con chatbot                                   │
│  - Formularios completados                                     │
│                                                                  │
│  Output: Etapa del funnel + confidence score                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    AGENTE SCORING                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Función: Calcular score de probabilidad de conversión          │
│                                                                  │
│  SCORING MODEL:                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ DEMOGRAPHIC (30%)                                         │    │
│  │ ├── Título/Puesto → Seniority                            │    │
│  │ ├── Empresa → Tamaño, Sector                             │    │
│  │ └── Presupuesto indicado → Fit financiero                │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │ BEHAVIORAL (40%)                                          │    │
│  │ ├── Visitas a pricing → Intento comercial                │    │
│  │ ├── Descarga de brochure → Interés formal                │    │
│  │ ├── Multiple sessions → Engagement activo                 │    │
│  │ └── Recency → Momentum                                   │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │ ENGAGEMENT (30%)                                          │    │
│  │ ├── Respuestas WhatsApp → Engagement activo               │    │
│  │ ├── Email opens/clicks → Nurture response                │    │
│  │ └── Demo request → Alta intención                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Score Range: 0-100                                            │
│  Hot: 75-100 | Warm: 50-74 | Cold: 0-49                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    AGENTE ASSIGNMENT                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Función: Asignar lead al comercial óptimo                     │
│                                                                  │
│  CRITERIOS DE ASIGNACIÓN:                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │  Round Robin (configurable)                              │    │
│  │     └─► Para igual disponibilidad y skill                │    │
│  │                                                          │    │
│  │  Skill-Based Routing                                     │    │
│  │     └─► Empresa grande → Comercial enterprise            │    │
│  │     └─► PyME → Comercial SMB                             │    │
│  │     └─► Curso técnico → Comercial especializado          │    │
│  │                                                          │    │
│  │  Territory-Based                                         │    │
│  │     └─► Geolocalización (España)                         │    │
│  │                                                          │    │
│  │  Capacity-Based                                          │    │
│  │     └─► Carga de lavoro por comercial                    │    │
│  │     └─► Max leads activos                                │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Output: Commercial ID + SLA timer                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.5 Email Tracking

```
┌─────────────────────────────────────────────────────────────────┐
│                      EMAIL TRACKING                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Platform: Brevo / Mailchimp / SendGrid                        │
│                                                                  │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│   │ Open Tracker │  │ Click       │  │ Unsubscribe             │ │
│   │ (1px pixel) │  │ Tracker      │  │ Handler                 │ │
│   └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                                                  │
│   DATA CAPTURED:                                                │
│   ├── Email opens (timestamp, count, device)                   │
│   ├── Link clicks (URL, timestamp, location in email)           │
│   ├── Forward behavior (detected via unique link)               │
│   └── Bounce / unsubscribe / spam complaint                     │
│                                                                  │
│   INTEGRATION:                                                  │
│   └── Webhook → Orquestador (behavioral signal)                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Flujo de Datos Completo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUJO END-TO-END                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. CAPTACIÓN                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                         │ │
│  │  Landing ──► Usuario completa form ──► Webhook POST /api/leads        │ │
│  │                │                                                        │ │
│  │                └──► Tracking SDK captura session_data                   │ │
│  │                                                                         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│                                      ▼                                       │
│  2. PROCESAMIENTO                                                            │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                         │ │
│  │  Orquestador recibe lead_data + session_data                           │ │
│  │       │                                                                │ │
│  │       ├──► Funnel Agent ──► Clasifica etapa                             │ │
│  │       │                                                                  │ │
│  │       ├──► Scoring Agent ──► Calcula score (0-100)                     │ │
│  │       │                                                                  │ │
│  │       └──► WhatsApp Bot ──► Primer mensaje auto (si habilitado)        │ │
│  │                                                                         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│                                      ▼                                       │
│  3. DISTRIBUCIÓN                                                            │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                         │ │
│  │  Assignment Agent                                                      │ │
│  │       │                                                                │ │
│  │       ├──► Selecciona comercial según routing rules                    │ │
│  │       │                                                                  │ │
│  │       └──► CRM Injection                                              │ │
│  │            │                                                           │ │
│  │            ├──► PipeDrive / HubSpot API                                 │ │
│  │            │    POST /api/crm/leads                                    │ │
│  │            │                                                            │ │
│  │            └──► Encola task para comercial (Slack/email notif)          │ │
│  │                                                                         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│                                      ▼                                       │
│  4. MEDICIÓN                                                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                         │ │
│  │  Data Warehouse (BigQuery / PostgreSQL)                                │ │
│  │       │                                                                 │ │
│  │       ├──► Métricas de funnel (conversion rates)                       │ │
│  │       ├──► Métricas de scoring (accuracy)                              │ │
│  │       ├──► Métricas de assignment (response time)                      │ │
│  │       └──► Métricas de revenue (closed won, revenue)                   │ │
│  │                                                                          │ │
│  │  Dashboard (Metabase / Grafana / Custom)                                │ │
│  │       └──► KPIs en tiempo real                                         │ │
│  │                                                                          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Dashboard de KPIs

### 4.1 KPIs de Captación

```
┌─────────────────────────────────────────────────────────────────┐
│              DASHBOARD — CAPTACIÓN                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                                                             │ │
│  │  LEADS RECIBIDOS                                            │ │
│  │  ┌─────────────────────────────────────────────────────┐   │ │
│  │  │  Total     │  Hot    │  Warm    │  Cold             │   │ │
│  │  │  1,234     │  156    │  445     │  633              │   │ │
│  │  │  ▲ 12%     │  ▲ 8%   │  ▲ 15%   │  ▼ 5%             │   │ │
│  │  └─────────────────────────────────────────────────────┘   │ │
│  │                                                             │ │
│  │  CONVERSION FUNNEL                                          │ │
│  │  ┌─────────────────────────────────────────────────────┐   │ │
│  │  │                                                         │   │ │
│  │  │   Visit ──► Lead ──► MQL ──► SQL ──► Opp ──► Close   │   │ │
│  │  │   10,000   1,234   890     445    234    78           │   │ │
│  │  │    100%    12.3%  72.1%   50%    52.6%   33.3%        │   │ │
│  │  │                                                         │   │ │
│  │  └─────────────────────────────────────────────────────┘   │ │
│  │                                                             │ │
│  │  FUENTES                                                    │ │
│  │  ┌─────────────────────────────────────────────────────┐   │ │
│  │  │  Landing A  ████████████████████  45%               │   │ │
│  │  │  Landing B  ██████████████       32%               │   │ │
│  │  │  WhatsApp   ████████             18%               │   │ │
│  │  │  Referral   ███                   5%               │   │ │
│  │  └─────────────────────────────────────────────────────┘   │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 KPIs de Performance Comercial

```
┌─────────────────────────────────────────────────────────────────┐
│              DASHBOARD — COMERCIAL                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                                                             │ │
│  │  RESPONSE TIME                                              │ │
│  │  ┌─────────────────────────────────────────────────────┐   │ │
│  │  │  Target: < 15 min                                     │   │ │
│  │  │  Current Avg: 8 min  ████████████████████✓           │   │ │
│  │  │  SLA Met: 94%                                          │   │ │
│  │  └─────────────────────────────────────────────────────┘   │ │
│  │                                                             │ │
│  │  COMERCIAL PERFORMANCE                                      │ │
│  │  ┌─────────────────────────────────────────────────────┐   │ │
│  │  │                                                         │   │ │
│  │  │  Comercial A  │ Leads: 45 │ Opp: 12 │ Close: 3  │ 67%│   │ │
│  │  │  Comercial B  │ Leads: 38 │ Opp: 15 │ Close: 5  │ 83%│   │ │
│  │  │  Comercial C  │ Leads: 52 │ Opp: 18 │ Close: 6  │ 77%│   │ │
│  │  │                                                         │   │ │
│  │  └─────────────────────────────────────────────────────┘   │ │
│  │                                                             │ │
│  │  PIPELINE VALUE                                             │ │
│  │  ┌─────────────────────────────────────────────────────┐   │ │
│  │  │  €245,000 in opportunities                          │   │ │
│  │  │  €78,000 closed this month                           │   │ │
│  │  │  Avg deal size: €3,200                               │   │ │
│  │  └─────────────────────────────────────────────────────┘   │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 KPIs de IA

```
┌─────────────────────────────────────────────────────────────────┐
│              DASHBOARD — IA PERFORMANCE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                                                             │ │
│  │  WHATSAPP BOT                                               │ │
│  │  ┌─────────────────────────────────────────────────────┐   │ │
│  │  │  Messages: 3,456    Avg Response: 2.3s                │   │ │
│  │  │  Resolution Rate: 67%    Escalations: 33%            │   │ │
│  │  │  CSAT: 4.2/5                                       │   │ │
│  │  └─────────────────────────────────────────────────────┘   │ │
│  │                                                             │ │
│  │  SCORING ACCURACY                                           │ │
│  │  ┌─────────────────────────────────────────────────────┐   │ │
│  │  │                                                         │   │ │
│  │  │  Predicted Hot → Actually Converted: 78%              │   │ │
│  │  │  Predicted Warm → Actually Converted: 52%             │   │ │
│  │  │  Predicted Cold → Actually Converted: 12%             │   │ │
│  │  │                                                         │   │ │
│  │  │  Model Precision: 72%                                 │   │ │
│  │  │  Model Recall: 68%                                     │   │ │
│  │  │                                                         │   │ │
│  │  └─────────────────────────────────────────────────────┘   │ │
│  │                                                             │ │
│  │  FUNNEL CLASSIFICATION                                      │ │
│  │  ┌─────────────────────────────────────────────────────┐   │ │
│  │  │  Awareness: 45%    Interest: 30%                     │   │ │
│  │  │  Consideration: 18%  Decision: 7%                   │   │ │
│  │  └─────────────────────────────────────────────────────┘   │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Stack Tecnológico

### 5.1 Backend Core

| Componente | Tecnología | Justificación |
|-----------|-------------|---------------|
| API Gateway | Kong / AWS API Gateway | Rate limiting, auth, logging |
| Runtime | Node.js 20 LTS / Bun | JSON handling, async I/O |
| Orquestador IA | LangGraph / LangChain | Agentes, tool calling, memoria |
| LLM Provider | OpenAI GPT-4o / Claude 3.5 | Reasoning, function calling |
| Base de datos | PostgreSQL 16 | Datos estructurados, JSONB |
| Cache | Redis | Sessions, rate limiting, pub/sub |
| Queue | BullMQ (Redis) | Jobs async, retry, priorities |
| Vector DB | Pinecone / Qdrant | Memoria de agentes, RAG |

### 5.2 Integraciones

| Integración | Proveedor | Uso |
|-------------|-----------|-----|
| WhatsApp | Twilio / 360dialog | Mensajería business |
| Email | Brevo / SendGrid | Email marketing, tracking |
| SMS | Twilio | Notificaciones fallback |
| CRM | PipeDrive / HubSpot | Gestión comercial |
| Telephony | Twilio Voice | Llamadas inbound/outbound |
| Analytics | Segment / Mixpanel | Event tracking |
| Dashboard | Metabase / Grafana | Visualización KPIs |

### 5.3 Frontend

| Componente | Tecnología |
|------------|-------------|
| Dashboard | React 18 + TypeScript |
| State | Zustand / TanStack Query |
| Charts | Recharts / Tremor |
| Commercial App | React Native (iOS/Android) |
| Landing SDK | Vanilla JS + TypeScript |

### 5.4 Infrastructure

```
┌─────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE (AWS)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                     VPC (Private)                            │ │
│  │                                                              │ │
│  │   ┌──────────────────────────────────────────────────────┐  │ │
│  │   │              ECS Fargate (Backend)                     │  │ │
│  │   │   ┌─────────┐  ┌─────────┐  ┌─────────┐             │  │ │
│  │   │   │  API    │  │ Worker  │  │  IA     │             │  │ │
│  │   │   │ Service │  │ Service │  │ Service │             │  │ │
│  │   │   └─────────┘  └─────────┘  └─────────┘             │  │ │
│  │   └──────────────────────────────────────────────────────┘  │ │
│  │                                                              │ │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │ │
│  │   │ RDS     │  │ Elasti  │  │ S3      │  │ SQS     │      │ │
│  │   │PostgreSQL│  │Cache    │  │ Assets  │  │ Queue   │      │ │
│  │   └─────────┘  └─────────┘  └─────────┘  └─────────┘      │ │
│  │                                                              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                     CloudFront CDN                           │ │
│  │                     (Static Assets, SDK)                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Roadmap de Desarrollo

### Fase 1: Foundation (Semanas 1-6)

```
┌─────────────────────────────────────────────────────────────────┐
│  FASE 1: FOUNDATION                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Semanas 1-2: Arquitectura Core                                │
│  ├── Setup infraestructura (AWS, DB, Redis)                     │
│  ├── API Gateway + Auth (JWT, API Keys)                         │
│  └── Webhooks base (recepción de leads)                         │
│                                                                  │
│  Semanas 3-4: Tracking SDK                                      │
│  ├── Script inyectable para landings                            │
│  ├── Captura de eventos (page, click, form)                      │
│  ├── Identity resolution (anonymous → known)                    │
│  └── Testing con 3 landings piloto                               │
│                                                                  │
│  Semanas 5-6: Data Layer                                        │
│  ├── Schema de Lead (PostgreSQL)                                │
│  ├── CRM injection básica (PipeDrive)                           │
│  └── Métricas de captación (dashboard básico)                  │
│                                                                  │
│  ✓ Entregable: SDK funcional + API de leads + dashboard MVP     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Fase 2: AI Foundation (Semanas 7-12)

```
┌─────────────────────────────────────────────────────────────────┐
│  FASE 2: AI FOUNDATION                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Semanas 7-8: Orquestador                                       │
│  ├── LangGraph setup                                            │
│  ├── Context aggregator (sesión + histórico)                    │
│  └── Routing engine (rules-based inicial)                       │
│                                                                  │
│  Semanas 9-10: Funnel + Scoring Agents                          │
│  ├── Agente Funnel (clasificación etapa)                        │
│  ├── Agente Scoring (modelo v1 - reglas + ML básico)            │
│  └── Integración con orquestador                                 │
│                                                                  │
│  Semanas 11-12: WhatsApp Integration                           │
│  ├── Twilio/360dialog setup                                    │
│  ├── FAQ Bot (preguntas frecuentes)                             │
│  ├── Qualification flow                                          │
│  └── Webhook → Orquestador                                      │
│                                                                  │
│  ✓ Entregable: Orquestador + 3 agentes + WhatsApp bot v1        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Fase 3: Intelligence Layer (Semanas 13-18)

```
┌─────────────────────────────────────────────────────────────────┐
│  FASE 3: INTELLIGENCE LAYER                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Semanas 13-14: Assignment Agent                               │
│  ├── Skill-based routing                                        │
│  ├── Round-robin configurable                                   │
│  ├── Territory logic                                            │
│  └── Capacity-based balancing                                   │
│                                                                  │
│  Semanas 15-16: Email Nurturing                                 │
│  ├── Brevo/SendGrid integration                                 │
│  ├── Tracking pixels + click tracking                            │
│  ├── Behavioral triggers                                         │
│  └── Orquestador → Nurture flows                                │
│                                                                  │
│  Semanas 17-18: ML Scoring v2                                   │
│  ├── Modelo predictivo (lead scoring)                          │
│  ├── A/B testing de features                                    │
│  ├── Feedback loop (conversiones → training)                     │
│  └── Scoring accuracy dashboard                                 │
│                                                                  │
│  ✓ Entregable: Asignación inteligente + nurturing + ML scoring   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Fase 4: Polish + Scale (Semanas 19-24)

```
┌─────────────────────────────────────────────────────────────────┐
│  FASE 4: POLISH + SCALE                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Semanas 19-20: Dashboard Complete                              │
│  ├── KPIs de captación                                          │
│  ├── Performance comercial                                       │
│  ├── IA performance                                             │
│  └── Revenue analytics                                          │
│                                                                  │
│  Semanas 21-22: Multi-tenant                                    │
│  ├── Aislación de datos por cliente                             │
│  ├── Onboarding flow                                            │
│  ├── Configuración de routing por empresa                        │
│  └── API keys + rate limits por cliente                         │
│                                                                  │
│  Semanas 23-24: Testing + Launch                                │
│  ├── Load testing (1M events/day target)                        │
│  ├── Security audit                                              │
│  ├── Documentación API                                          │
│  └── Beta con 5 empresas piloto                                  │
│                                                                  │
│  ✓ Entregable: Producto listo para producción                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Modelo de Negocio

### 7.1 Pricing Sugerido (España)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PLANES                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STARTER          PROFESSIONAL         ENTERPRISE               │
│  €299/mes         €799/mes            Custom                     │
│                                                                  │
│  ┌─────────────┐   ┌─────────────┐     ┌─────────────┐          │
│  │ 500 leads   │   │ 2,000 leads │     │ Unlimited   │          │
│  │ 1 landing   │   │ 5 landings  │     │ Landings     │          │
│  │ WhatsApp    │   │ WhatsApp    │     │ WhatsApp     │          │
│  │ Basic       │   │ Advanced    │     │ + Voice AI   │          │
│  │ Dashboard   │   │ Full Suite  │     │ + SLA 99.9%  │          │
│  │ Email       │   │ Email +     │     │ + Dedicated  │          │
│  │ Support     │   │ Nurturing   │     │ CSM         │          │
│  │             │   │ Priority    │     │ + Custom    │          │
│  │             │   │ Support     │     │   Integrations│        │
│  └─────────────┘   └─────────────┘     └─────────────┘          │
│                                                                  │
│  Overage: €0.50/leads adicional                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Unit Economics

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNIT ECONOMICS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CAC (Customer Acquisition Cost):                               │
│  ├── Sales effort: €2,000 (avg deal)                            │
│  ├── Marketing: €500                                            │
│  └── Total CAC: €2,500                                          │
│                                                                  │
│  LTV (Lifetime Value):                                          │
│  ├── ARPU: €599/mes                                             │
│  ├── Churn: 8% mensual                                          │
│  └── LTV: €599 / 0.08 = €7,487                                  │
│                                                                  │
│  LTV:CAC Ratio: 7,487 / 2,500 = 2.99x                          │
│  Target: > 3x (bueno para SaaS)                                 │
│                                                                  │
│  Payback Period: 4-5 meses                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Equipo Necesario

### Fase MVP (Meses 1-3)
| Rol | Cantidad | Responsabilidad |
|-----|----------|-----------------|
| Tech Lead | 1 | Arquitectura, code review |
| Backend Dev | 1 | API, integraciones, IA |
| Frontend Dev | 1 | Dashboard, SDK |
| Designer | 0.5 | UI/UX, dashboard |

### Fase Growth (Meses 4-6)
| Rol | Cantidad | Responsabilidad |
|-----|----------|-----------------|
| Tech Lead | 1 | Continuar arquitectura |
| Backend Dev | 2 | Paralelizar features |
| Frontend Dev | 1 | Dashboard + app móvil |
| ML Engineer | 1 | Scoring, optimización |
| Designer | 1 | UI/UX consistente |
| DevOps | 0.5 | Infraestructura |

---

## 9. Riesgos y Mitigaciones

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|--------------|------------|
| WhatsApp API policy changes | Alto | Media | Tener múltiples proveedores (Twilio + 360dialog) |
| GDPR compliance | Alto | Alta | Legal review, consent management, data minimization |
| LLM cost escalation | Medio | Media | Cache, modelo pequeño para casos simples |
| Churn alto en Starter | Medio | Media | Onboarding mejorado, upsell triggers |
| Competencia | Medio | Media | Diferenciarse en vertical education |
| Data privacy Spain | Alto | Media | encryption at rest, SOC2 compliance |

---

## 10. Anexos

### 10.1 Schema de Lead

```sql
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Contact Info
    email VARCHAR(255),
    phone VARCHAR(50),
    name VARCHAR(255),
    company VARCHAR(255),
    job_title VARCHAR(255),
    
    -- Source
    source VARCHAR(50), -- 'landing', 'whatsapp', 'referral', 'organic'
    landing_id UUID REFERENCES landings(id),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    
    -- Scoring
    score INTEGER DEFAULT 0,
    intent_level VARCHAR(20) DEFAULT 'cold', -- cold, warm, hot
    funnel_stage VARCHAR(50) DEFAULT 'awareness',
    
    -- Assignment
    assigned_commercial_id UUID REFERENCES commercials(id),
    assigned_at TIMESTAMP,
    sla_deadline TIMESTAMP,
    
    -- CRM
    crm_id VARCHAR(100),
    crm_opportunity_id VARCHAR(100),
    
    -- Context
    interests TEXT[], -- Array of interests extracted
    budget_range VARCHAR(50),
    timeline VARCHAR(50),
    context_summary TEXT,
    
    -- Tracking
    sessions_count INTEGER DEFAULT 0,
    pages_viewed INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leads_score ON leads(score DESC);
CREATE INDEX idx_leads_intent ON leads(intent_level);
CREATE INDEX idx_leads_commercial ON leads(assigned_commercial_id);
CREATE INDEX idx_leads_created ON leads(created_at DESC);
```

### 10.2 API Endpoints

```
┌─────────────────────────────────────────────────────────────────┐
│                    API ENDPOINTS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LEADS                                                           │
│  POST   /api/v1/leads                    Create lead            │
│  GET    /api/v1/leads                    List leads (paginated) │
│  GET    /api/v1/leads/:id                Get lead detail        │
│  PATCH  /api/v1/leads/:id                Update lead           │
│  POST   /api/v1/leads/:id/notes          Add note              │
│                                                                  │
│  TRACKING                                                        │
│  POST   /api/v1/events                   Ingest tracking event │
│  GET    /api/v1/landings/:id/sessions    Sessions for landing   │
│                                                                  │
│  COMMERCIALS                                                    │
│  GET    /api/v1/commercials              List commercials       │
│  GET    /api/v1/commercials/:id/leads    Leads assigned        │
│  PATCH  /api/v1/commercials/:id/capacity Update capacity        │
│                                                                  │
│  DASHBOARD                                                       │
│  GET    /api/v1/kpis/capture             Capture KPIs          │
│  GET    /api/v1/kpis/conversion          Funnel KPIs           │
│  GET    /api/v1/kpis/commercial          Commercial KPIs        │
│  GET    /api/v1/kpis/ai                  AI Performance KPIs     │
│                                                                  │
│  WHATSAPP                                                        │
│  POST   /api/v1/whatsapp/webhook         Twilio webhook         │
│  POST   /api/v1/whatsapp/send            Send message          │
│                                                                  │
│  WEBHOOKS                                                        │
│  POST   /api/v1/webhooks                 Register webhook       │
│  GET    /api/v1/webhooks                List webhooks          │
│  DELETE /api/v1/webhooks/:id            Remove webhook         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. Próximos Pasos

1. **Validación de mercado** — Contactar 10 empresas de formación para validar dolor
2. **Definición de pricing** — Encuesta a potenciales clientes
3. **MVP scope** — Reducir a 1 landing, 1 flujo de WhatsApp
4. **Tech stack final** — Selección de proveedores (CRM, Email, WhatsApp)
5. **Alpha launch** — 2-3 empresas piloto gratuitas a cambio de feedback

---

*Documento creado para planificación interna de Zentria SaaS*
*Todos los diagramas en formato Mermaid disponibles bajo request*
