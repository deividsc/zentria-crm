# Especificación Técnica: Multi-Social Integration

## 📋 Alcance (Scope)

### In-Scope
- **WhatsApp Business API** (P1-MUST): Canal prioritario con alta adopción business
- **Telegram Bot API** (P1-SHOULD): Gratis, madura, fácil implementación
- **Arquitectura extensible**: Pattern Strategy para agregar providers fácilmente
- **Sistema de colas**: Redis Streams para outbound messages con retry
- **Webhook handler unificado**: Normalización de eventos de todos los providers
- **Conversation tracking**: Seguimiento de hilos de conversación por canal
- **Template management**: Gestión de templates para WhatsApp

### Out-of-Scope (V1)
- Instagram Messaging API
- Facebook Messenger
- Twitter/X DM API
- LinkedIn Messaging

### Future (V2)
- Instagram y Messenger (mismo ecosistema Meta)
- Análisis de sentimiento
- Chatbot con NLP avanzado

---

## ✅ Acceptance Criteria

### AC1: Provider Abstraction
- [ ] Interfaz `Provider` con métodos: `SendMessage`, `GetStatus`, `ValidateWebhook`, `ParseWebhook`
- [ ] Implementación de WhatsAppProvider sin modificar código existente
- [ ] Implementación de TelegramProvider sin modificar código existente

### AC2: WhatsApp Business Integration
- [ ] Envío de mensajes de texto via Twilio API
- [ ] Recepción de mensajes via webhook
- [ ] Soporte de templates pre-aprobados
- [ ] Tracking de ventana 24h para conversaciones
- [ ] Rate limiting respetado (80 msg/s)

### AC3: Telegram Integration
- [ ] Envío de mensajes via Bot API
- [ ] Soporte de Markdown en mensajes
- [ ] Recepción de mensajes via webhook
- [ ] Manejo de comandos (/start, /help)

### AC4: Queue System
- [ ] Cola Redis Streams para mensajes salientes
- [ ] Retry con exponential backoff (5s, 10s, 30s, 1min, 5min)
- [ ] Dead Letter Queue (DLQ) para mensajes fallidos después de 5 retries
- [ ] Worker consumers concurrentes

### AC5: API REST
- [ ] `POST /api/v1/messages` - Enviar mensaje
- [ ] `GET /api/v1/conversations/:id` - Obtener conversación
- [ ] `GET /api/v1/conversations` - Listar conversaciones
- [ ] `POST /webhooks/:provider` - Webhook unificado

### AC6: Resilience
- [ ] Circuit breaker: 10 fallos → 1 min open
- [ ] Health checks para providers
- [ ] Graceful degradation si un provider falla

### AC7: Observability
- [ ] Logs estructurados con zap
- [ ] Métricas Prometheus: messages_sent, messages_failed, webhook_latency
- [ ] Alertas para DLQ > 100 mensajes

---

## 🧪 Tests de Aceptación

### Test 1: Happy Path - WhatsApp
```
GIVEN un usuario con teléfono +5491123456789
WHEN se envía POST /api/v1/messages con provider=whatsapp
THEN el mensaje se encola en Redis
AND el worker lo envía via Twilio
AND se recibe confirmación de delivery
AND el webhook actualiza status a "delivered"
```

### Test 2: Happy Path - Telegram
```
GIVEN un usuario con chat_id 123456789
WHEN se envía POST /api/v1/messages con provider=telegram
THEN el mensaje se envía via Bot API
AND se recibe confirmación inmediata
```

### Test 3: Retry Logic
```
GIVEN WhatsApp API está caído
WHEN se intenta enviar un mensaje
THEN se reintenta 5 veces con backoff exponencial
AND después del 5to fallo, va a DLQ
AND se envía alerta al equipo
```

### Test 4: Webhook Verification
```
GIVEN un webhook de WhatsApp con firma inválida
WHEN llega POST /webhooks/whatsapp
THEN retorna 401 Unauthorized
AND no procesa el mensaje
```

### Test 5: Rate Limiting
```
GIVEN se envían 100 mensajes en 1 segundo
WHEN se excede el rate limit de Twilio
THEN los mensajes extras se encolan
AND se procesan cuando baja el rate
```

### Test 6: Provider Fallback
```
GIVEN WhatsApp está caído (circuit breaker open)
WHEN se intenta enviar mensaje por WhatsApp
THEN el sistema retorna error 503
AND sugiere usar Telegram si el usuario lo tiene configurado
```

---

## 🏗️ Arquitectura

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   API Gateway   │────▶│ Orchestrator │────▶│  Redis Streams  │
└─────────────────┘     └──────────────┘     └─────────────────┘
                              │                        │
                              ▼                        ▼
                       ┌──────────────┐        ┌──────────────┐
                       │   Circuit    │        │    Worker    │
                       │   Breaker    │        │   Consumers  │
                       └──────────────┘        └──────────────┘
                                                        │
                              ┌─────────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │ Provider Strategy │
                    │     Interface      │
                    └──────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │ WhatsApp │    │ Telegram │    │  Future  │
        │ Provider │    │ Provider │    │ Provider │
        └──────────┘    └──────────┘    └──────────┘
```

---

## 📊 Estimación

| Fase | Tasks | Horas | Semanas |
|------|-------|-------|---------|
| Foundation | 17 | 28h | 1 |
| WhatsApp | 17 | 38h | 1 |
| Telegram | 11 | 24h | 1 |
| Queue & Workers | 17 | 32h | 1 |
| API & Integration | 17 | 34h | 1 |
| Observability | 17 | 26h | 1 |
| **Total** | **96** | **182h** | **6 semanas** |

---

## 💰 Costos Estimados (Mensual)

### WhatsApp Business API (Twilio)
- 10,000 conversaciones iniciadas por usuario: $0.005 × 10,000 = $50
- 5,000 conversaciones iniciadas por business: $0.025 × 5,000 = $125
- Markup Twilio (~25%): ~$44
- **Subtotal: ~$219/mes**

### Telegram Bot API
- **Gratis** (hasta 30 mensajes/segundo)

### Infraestructura
- Redis (Elasticache): ~$15/mes
- Workers (ECS/Fargate): ~$30/mes
- **Subtotal: ~$45/mes**

### **Total Estimado: ~$264/mes**

---

## ⚠️ Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Bloqueo de cuenta WhatsApp | Alto | Opt-in estricto, quality monitoring, rate limiting |
| Cambios en API de Meta | Medio | Abstracción de provider, versionado, tests automatizados |
| Costos impredecibles | Medio | Alertas de spending, budget caps, optimización de templates |
| Webhook failures | Medio | Retry con exponential backoff, DLQ, fallback a polling |
| GDPR/Compliance | Alto | Data retention policies (90 días), consent tracking, audit logs |

---

## 📚 Recursos

- [WhatsApp Business API Docs](https://business.whatsapp.com/products/business-platform)
- [Twilio WhatsApp API](https://www.twilio.com/docs/whatsapp)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Redis Streams](https://redis.io/docs/data-types/streams/)

---

**Documento generado:** 2026-04-11
**Versión:** 1.0
**Status:** Ready for Development
