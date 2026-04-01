# n8n Workflow - Lead Capture

## Configuración Manual

### 1. Acceder a n8n
URL: http://136.115.7.41/n8n/
Usuario: `admin`
Contraseña: `zentria_n8n_2024`

### 2. Crear Nuevo Workflow
1. Click en "New Workflow"
2. Buscar nodo "Webhook" y arrastrarlo
3. Configurar:
   - HTTP Method: POST
   - Path: `lead-capture`
   - Response: Last Node

### 3. Agregar Nodo Odoo
1. Agregar nodo "Odoo CRM" o usar HTTP Request
2. Configurar conexión:
   - URL: http://136.115.7.41/xmlrpc/2/object
   - Method: execute_kw
   - Args: 
     ```json
     ["zentria", 1, "b898fe9dde24fe76d0456c65fcf64732be8604a3", "crm.lead", "create", [{"name": "{{ $json.nombre }}", "email_from": "{{ $json.email }}", "phone": "{{ $json.telefono }}", "description": "Interés: {{ $json.interes }}"}]]
     ```

### 4. Agregar Nodo Email
1. Usar nodo "Email Send"
2. Configurar:
   - To: davidscuderi@hotmail.com
   - Subject: "Nuevo Lead: {{ $json.nombre }}"
   - Body: Datos del lead

### 5. Activar Webhook
1. Click en el nodo Webhook
2. Toggle "Activate"
3. Copiar la URL del webhook

### 6. Actualizar Landing Page
Actualizar el archivo `js/tracking.js` con la URL del webhook:
```javascript
const CONFIG = {
    webhookUrl: 'http://136.115.7.41/webhook/lead-capture'
};
```

## Conexión Odoo via HTTP Request (alternativa)

Si no tenés el nodo de Odoo instalado, usá HTTP Request:

```
POST http://136.115.7.41/jsonrpc
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "call",
  "params": {
    "service": "object",
    "method": "execute_kw",
    "args": [
      "zentria",
      1,
      "b898fe9dde24fe76d0456c65fcf64732be8604a3",
      "crm.lead",
      "create",
      [{
        "name": "{{ $json.nombre }}",
        "email_from": "{{ $json.email }}",
        "phone": "{{ $json.telefono }}",
        "description": "{{ $json.mensaje }}",
        "tag_ids": [[6, 0, [1]]]
      }]
    ]
  },
  "id": 1
}
```

## Testing

Para probar el webhook:
```bash
curl -X POST http://136.115.7.41/webhook/lead-capture \
  -H "Content-Type: application/json" \
  -d '{
    "form_type": "contacto",
    "nombre": "Test User",
    "email": "test@test.com",
    "telefono": "123456789",
    "interes": "avanzado",
    "utm_source": "direct",
    "utm_medium": "none"
  }'
```
