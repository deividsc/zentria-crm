# Definición Técnica: Multi-Social Integration

## 1. Visión General

Este documento define la arquitectura técnica para extender el sistema de notificaciones de Zentria SaaS a múltiples redes sociales, priorizando WhatsApp Business y Telegram.

### Objetivos
- Proveer una plataforma unificada de mensajería multi-canal
- Maximizar reach y engagement de usuarios
- Mantener arquitectura extensible para futuros providers
- Garantizar compliance y seguridad

---

## 2. Comparativa de Providers

### 2.1 WhatsApp Business API

| Aspecto | Detalle |
|---------|---------|
| **API** | Meta Cloud API / Twilio |
| **Pricing** | ~$0.005-0.025 por conversación (24h) |
| **Free Tier** | No |
| **Rate Limits** | 80 msg/s por número |
| **Webhooks** | Sí, con verificación de firma |
| **Templates** | Requeridos para mensajes outbound |
| **Approval** | Business verification necesaria |
| **Pros** | Alta apertura (~98%), business-focused, rich media |
| **Cons** | Costo elevado, proceso de aprobación, templates restrictivos |

### 2.2 Telegram Bot API

| Aspecto | Detalle |
|---------|---------|
| **API** | Bot API (HTTP-based) |
| **Pricing** | **Gratis** |
| **Free Tier** | Ilimitado (30 msg/s limit) |
| **Rate Limits** | 30 msg/s por bot |
| **Webhooks** | Sí, via setWebhook |
| **Templates** | No requeridos |
| **Approval** | Instantáneo (@BotFather) |
| **Pros** | Gratis, muy madura, markdown support, bots ecosystem |
| **Cons** | Menor adopción general, usuarios más técnicos |

### 2.3 Instagram Messaging API

| Aspecto | Detalle |
|---------|---------|
| **API** | Meta Graph API |
| **Pricing** | Incluido con WhatsApp Business |
| **Free Tier** | N/A |
| **Rate Limits** | Similar a WhatsApp |
| **Webhooks** | Sí |
| **Templates** | No requeridos (conversación abierta) |
| **Approval** | Business verification |
| **Pros** | Mismo ecosistema Meta, audience joven |
| **Cons** | Requiere presencia en Instagram |

### 2.4 Comparativa Resumida

| Provider | Costo | Complejidad | Tiempo Setup | Prioridad |
|----------|-------|-------------|--------------|-----------|
| **WhatsApp** | $$$ | Media | 1-2 semanas | P1-MUST |
| **Telegram** | Free | Baja | 1 día | P1-SHOULD |
| **Instagram** | $$ | Media | 1 semana | P2-COULD |
| **Messenger** | $$ | Media | 1 semana | P2-COULD |
| **Twitter/X** | $$$$ | Alta | 2-4 semanas | P3-WONT |
| **LinkedIn** | $$$ | Alta | 2-4 semanas | P3-WONT |

---

## 3. Guía de Configuración

### 3.1 WhatsApp Business (Twilio)

#### Paso 1: Crear cuenta Twilio
1. Registrarse en [twilio.com](https://www.twilio.com)
2. Verificar email y teléfono
3. Obtener Account SID y Auth Token

#### Paso 2: Activar WhatsApp Sandbox
1. Ir a Console > Messaging > Try it out > Send a WhatsApp message
2. Enviar mensaje de unión al número proporcionado
3. Sandbox activado para testing

#### Paso 3: Configurar Webhook
1. Ir a WhatsApp Sandbox Settings
2. Set webhook URL: `https://api.zentria.com/webhooks/whatsapp`
3. Copiar "Webhook URL for incoming messages"

#### Paso 4: Variables de Entorno
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=+14155238886
TWILIO_WEBHOOK_SECRET=xxxxxxxx
```

#### Paso 5: Verificación de Webhooks
Twilio envía firma en header `X-Twilio-Signature`. Verificar con:
```go
validator := twilio.NewRequestValidator(authToken)
isValid := validator.Validate(url, params, signature)
```

### 3.2 Telegram Bot

#### Paso 1: Crear Bot
1. Abrir Telegram y buscar @BotFather
2. Enviar `/newbot`
3. Seguir instrucciones para nombre y username
4. Guardar el token proporcionado

#### Paso 2: Configurar Webhook
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://api.zentria.com/webhooks/telegram"}'
```

#### Paso 3: Variables de Entorno
```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_WEBHOOK_SECRET=optional_secret_for_extra_security
```

#### Paso 4: Comandos del Bot
Configurar comandos en @BotFather:
```
/start - Iniciar conversación
/help - Ver ayuda
/status - Estado de cuenta
```

### 3.3 Redis Streams

#### Instalación Local (Docker)
```bash
docker run -d --name redis-social \
  -p 6379:6379 \
  redis:7-alpine \
  redis-server --appendonly yes
```

#### Configuración AWS ElastiCache
1. Crear cluster Redis 7.x
2. Habilitar encryption in-transit
3. Configurar security group para acceso desde ECS
4. Obtener endpoint y puerto

#### Variables de Entorno
```bash
REDIS_URL=redis://localhost:6379/0
REDIS_STREAM_MESSAGES=social:messages
REDIS_STREAM_DLQ=social:dlq
REDIS_CONSUMER_GROUP=social-workers
```

---

## 4. Arquitectura del Sistema

### 4.1 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                        Clientes                              │
│  (Web App, Mobile, External APIs)                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway                               │
│  • Rate limiting (100 req/min por API key)                  │
│  • Authentication (JWT)                                     │
│  • Request validation                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Orchestrator Service                       │
│  • Routing logic (determina provider)                       │
│  • Circuit breaker (10 fallos → 1 min open)                │
│  • Message enrichment                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Redis Streams                              │
│  Stream: social:messages                                    │
│  • Producer: Orchestrator                                   │
│  • Consumer Group: social-workers                           │
│  • DLQ: social:dlq (mensajes fallidos > 5 retries)         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Worker Pool                                │
│  • 5 workers concurrentes (configurable)                    │
│  • Cada worker: claim → process → ack/nack                 │
│  • Retry con exponential backoff                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                Provider Strategy Layer                       │
│  Interface: Provider                                         │
│  ├── WhatsAppProvider (Twilio)                              │
│  ├── TelegramProvider (Bot API)                             │
│  └── Future: InstagramProvider, MessengerProvider           │
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│  WhatsApp API    │      │  Telegram API    │
│  (Twilio/Meta)   │      │  (HTTP/Webhook)  │
└──────────────────┘      └──────────────────┘
          │                         │
          └────────────┬────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Unified Webhook Handler                         │
│  POST /webhooks/:provider                                   │
│  • Signature validation                                     │
│  • Event normalization                                      │
│  • Status updates (delivered, read, failed)                │
│  • Conversation tracking                                    │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Flujo de Mensaje Outbound

```
1. Cliente → POST /api/v1/messages
   {
     "provider": "whatsapp",
     "to": "+5491123456789",
     "content": "Hola! Tu pedido está listo"
   }

2. API Gateway → valida request

3. Orchestrator → determina provider
   → Verifica circuit breaker (¿provider healthy?)
   → Enriquece mensaje (template, variables)

4. Redis Streams ← XADD social:messages
   {
     "id": "msg_abc123",
     "provider": "whatsapp",
     "payload": {...},
     "attempt": 1,
     "created_at": "2026-04-11T19:50:00Z"
   }

5. Worker → XREADGROUP desde stream
   → Procesa mensaje
   → Llama a provider.SendMessage()
   → Si éxito: XACK
   → Si fallo: XACK + XADD retry con delay

6. Provider → HTTP POST a API externa
   → Twilio: api.twilio.com/2010-04-01/...
   → Telegram: api.telegram.org/bot<TOKEN>/sendMessage

7. Webhook ← Provider envía confirmación
   → POST /webhooks/whatsapp
   → Actualiza status en DB: "delivered"
```

### 4.3 Flujo de Mensaje Inbound

```
1. Usuario envía mensaje a número de WhatsApp/Telegram

2. Provider → POST /webhooks/:provider
   Headers: X-Twilio-Signature (WhatsApp) o sin firma (Telegram)
   Body: Payload específico del provider

3. Webhook Handler → ValidateWebhook()
   → Verifica firma (si aplica)
   → ParseWebhook() normaliza a estructura común:
     {
       "message_id": "...",
       "from": "+5491123456789",
       "content": "Hola, tengo una duda",
       "timestamp": "...",
       "provider": "whatsapp"
     }

4. Conversation Service → getOrCreateConversation()
   → Busca conversación activa por (user_id, provider)
   → Si no existe: crea nueva
   → Actualiza last_activity

5. Message Repository → saveMessage()
   → Guarda mensaje inbound
   → Trigger: notificación a sistema interno

6. (Opcional) Bot/AI → procesa mensaje
   → Si auto-responder habilitado: envía respuesta
```

---

## 5. Modelo de Datos

### 5.1 Tablas Principales

```sql
-- Providers configurados por tenant
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('whatsapp', 'telegram', 'instagram')),
    name VARCHAR(100) NOT NULL,
    config JSONB NOT NULL, -- credentials encriptadas, settings
    is_active BOOLEAN DEFAULT true,
    rate_limit_per_second INTEGER DEFAULT 10,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, type, name)
);

-- Conversaciones unificadas por canal
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    provider_id UUID NOT NULL REFERENCES providers(id),
    provider_type VARCHAR(20) NOT NULL,
    external_id VARCHAR(255) NOT NULL, -- phone, chat_id, etc.
    user_id UUID REFERENCES users(id), -- si está identificado
    context JSONB DEFAULT '{}', -- último contexto conocido
    window_expires_at TIMESTAMP, -- ventana 24h WhatsApp
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
    last_message_at TIMESTAMP,
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, provider_id, external_id)
);

CREATE INDEX idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX idx_conversations_provider ON conversations(provider_id);
CREATE INDEX idx_conversations_external ON conversations(external_id);
CREATE INDEX idx_conversations_window ON conversations(window_expires_at) 
    WHERE provider_type = 'whatsapp';

-- Mensajes (inbound y outbound)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    provider_message_id VARCHAR(255), -- ID externo del provider
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'video', 'document', 'template')),
    template_id UUID REFERENCES templates(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'read', 'failed')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}', -- delivery receipts, etc.
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_status ON messages(status) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- Templates para WhatsApp
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    provider_id UUID NOT NULL REFERENCES providers(id),
    name VARCHAR(100) NOT NULL,
    language VARCHAR(10) NOT NULL DEFAULT 'es',
    category VARCHAR(20) NOT NULL CHECK (category IN ('authentication', 'marketing', 'utility')),
    content TEXT NOT NULL, -- JSON con estructura del template
    variables JSONB DEFAULT '[]', -- definición de variables
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    external_id VARCHAR(255), -- ID en Meta
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, provider_id, name, language)
);

-- Dead Letter Queue para análisis
CREATE TABLE dlq_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_message_id UUID,
    provider VARCHAR(20) NOT NULL,
    payload JSONB NOT NULL,
    error TEXT NOT NULL,
    attempt_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dlq_created ON dlq_messages(created_at);
CREATE INDEX idx_dlq_resolved ON dlq_messages(resolved_at) WHERE resolved_at IS NULL;
```

---

## 6. Decisiones Técnicas

### 6.1 Queue: Redis Streams vs RabbitMQ

| Criterio | Redis Streams | RabbitMQ | Decisión |
|----------|--------------|----------|----------|
| **Operacional** | Simple (una instancia) | Complejo (clustering) | Redis ✅ |
| **Costo** | $15/mes (ElastiCache) | $50+/mes (Amazon MQ) | Redis ✅ |
| **Features** | Básico (suficiente) | Avanzado (no necesitamos) | Redis ✅ |
| **Equipo** | Familiaridad con Redis | Curva de aprendizaje | Redis ✅ |
| **Escalabilidad** | Hasta ~100k msg/día | Ilimitado | Redis ✅ (por ahora) |

**Decisión:** Redis Streams para MVP. Migrar a RabbitMQ si superamos 100k mensajes/día.

### 6.2 WhatsApp: Twilio vs Meta Direct

| Criterio | Twilio | Meta Direct | Decisión |
|----------|--------|-------------|----------|
| **Time to Market** | 1-2 días | 1-2 semanas | Twilio ✅ |
| **Costo** | +25% markup | Base | Meta (futuro) |
| **Soporte** | 24/7 incluido | Community/Enterprise | Twilio ✅ |
| **Features** | Limitado por Twilio | Completo | Meta (futuro) |
| **Setup** | Sandbox inmediato | Business verification | Twilio ✅ |

**Decisión:** Twilio para MVP (< 50k conversaciones/mes). Migrar a Meta Direct cuando el volumen justifique el ahorro.

### 6.3 Database: PostgreSQL vs MongoDB

| Criterio | PostgreSQL + JSONB | MongoDB | Decisión |
|----------|-------------------|---------|----------|
| **Relaciones** | Nativo (conversations-messages) | Manual | PostgreSQL ✅ |
| **Transacciones** | ACID completo | Limitado | PostgreSQL ✅ |
| **JSON** | JSONB flexible | Nativo | Empate |
| **Equipo** | Experiencia existente | Nueva curva | PostgreSQL ✅ |
| **Ecosistema** | sqlc, gorm maduros | Menos maduro en Go | PostgreSQL ✅ |

**Decisión:** PostgreSQL con JSONB para flexibilidad de schemas de providers.

---

## 7. Operaciones y Monitoreo

### 7.1 Métricas Clave

```yaml
# Prometheus metrics
social_messages_total:
  type: counter
  labels: [provider, direction, status]
  
social_message_latency_seconds:
  type: histogram
  labels: [provider, operation]
  
social_webhook_latency_seconds:
  type: histogram
  labels: [provider]
  
social_dlq_messages_total:
  type: gauge
  
social_circuit_breaker_state:
  type: gauge
  labels: [provider, state]  # 0=closed, 1=open, 2=half-open
  
social_conversations_active:
  type: gauge
  labels: [provider]
```

### 7.2 Alertas

```yaml
# AlertManager rules
- alert: HighMessageFailureRate
  expr: rate(social_messages_total{status="failed"}[5m]) > 0.1
  for: 5m
  severity: critical
  
- alert: DLQGrowing
  expr: social_dlq_messages_total > 100
  for: 10m
  severity: warning
  
- alert: CircuitBreakerOpen
  expr: social_circuit_breaker_state == 1
  for: 1m
  severity: warning
  
- alert: WebhookLatencyHigh
  expr: histogram_quantile(0.95, social_webhook_latency_seconds) > 2
  for: 5m
  severity: warning
```

### 7.3 Runbooks

#### Mensajes en DLQ
1. Revisar `dlq_messages` table: `SELECT * FROM dlq_messages WHERE resolved_at IS NULL`
2. Identificar patrón: ¿mismo provider? ¿mismo error?
3. Si provider caído: esperar recovery, reprocessar manualmente
4. Si datos inválidos: fix data, mover a cola principal

#### Circuit Breaker Open
1. Verificar estado del provider: `curl https://api.twilio.com`
2. Revisar logs: `kubectl logs deployment/social-worker | grep error`
3. Si falso positivo: reset manual del circuit breaker
4. Si provider caído: notificar usuarios, ofrecer alternativa (Telegram)

---

## 8. Seguridad y Compliance

### 8.1 Data Retention

- **Mensajes**: 90 días (GDPR compliant)
- **Conversaciones**: 1 año (metadata solamente)
- **DLQ**: 30 días o hasta resolución

### 8.2 Encriptación

- **In transit**: TLS 1.3 para todas las comunicaciones
- **At rest**: AWS KMS para credentials en DB
- **Backups**: Encriptados con claves separadas

### 8.3 Consentimiento

- Opt-in explícito requerido antes de primer mensaje
- Registro de consentimiento en `conversation.metadata`
- Comando `/stop` o "STOP" desactiva conversación

---

## 9. Plan de Rollout

### Fase 1: Foundation (Semana 1)
- [ ] Setup infraestructura (Redis, DB migrations)
- [ ] Implementar Provider interface
- [ ] Crear queue system básico

### Fase 2: WhatsApp (Semana 2)
- [ ] Integrar Twilio
- [ ] Configurar webhooks
- [ ] Testing con sandbox

### Fase 3: Telegram (Semana 3)
- [ ] Crear bot de producción
- [ ] Integrar Bot API
- [ ] Testing end-to-end

### Fase 4: Observability (Semana 4)
- [ ] Dashboards en Grafana
- [ ] Alertas configuradas
- [ ] Documentación de operaciones

### Fase 5: Go-Live (Semana 5)
- [ ] Soft launch (10% usuarios)
- [ ] Monitoreo intensivo
- [ ] Rollout completo

---

## 10. Referencias

- [Arquitectura de Referencia: Multi-Provider Strategy Pattern](https://martinfowler.com/articles/strategy-pattern.html)
- [Twilio WhatsApp Best Practices](https://www.twilio.com/docs/whatsapp/best-practices)
- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [Redis Streams Tutorial](https://redis.io/docs/data-types/streams-tutorial/)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)

---

**Documento generado:** 2026-04-11  
**Versión:** 1.0  
**Autor:** Zentria Engineering Team  
**Status:** Aprobado para implementación
