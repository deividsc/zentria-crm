# Migración GCP → Hetzner Cloud

## Por qué migrar

| | GCP e2-medium | Hetzner CX32 |
|---|---|---|
| vCPU | 2 | 4 |
| RAM | 4 GB | 8 GB |
| Disco | 20 GB SSD | 80 GB SSD |
| Precio/mes | ~€25–35 | €6.80 |
| Tráfico incluido | 1 GB | 20 TB |

El stack actual (Odoo 17 + n8n + Postgres + Redis + API) consume ~3 GB de RAM solo en idle. El CX32 da margen real.

---

## Fase 1 — Crear servidor en Hetzner

1. Ir a [console.hetzner.cloud](https://console.hetzner.cloud) → **New Project** → `zentria-crm`
2. Crear servidor:
   - **Location**: `eu-central` (Núremberg) o `eu-west` (Helsinki)
   - **Image**: Ubuntu 24.04
   - **Type**: CX32 (4 vCPU / 8 GB / 80 GB)
   - **SSH Key**: agregar tu clave pública local
   - **Firewall**: crear regla `zentria-fw` con puertos:
     ```
     22/tcp   → tu IP o 0.0.0.0/0
     80/tcp   → 0.0.0.0/0
     443/tcp  → 0.0.0.0/0
     3000/tcp → 0.0.0.0/0   (Zentria API)
     5678/tcp → 0.0.0.0/0   (n8n)
     8069/tcp → 0.0.0.0/0   (Odoo)
     ```
3. Anotar la IP pública asignada (ej: `5.161.X.X`)

---

## Fase 2 — Preparar el servidor nuevo

```bash
# Acceso inicial
ssh root@<HETZNER_IP>

# Actualización del sistema
apt update && apt upgrade -y

# Instalar Docker + Docker Compose
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin

# Crear usuario de deploy (opcional pero recomendado)
useradd -m -s /bin/bash zentria
usermod -aG docker zentria
```

---

## Fase 3 — Transferir el proyecto

Desde tu máquina local:

```bash
# Desde el directorio del repo zentria-crm
tar -czf - \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='sdk/dist' \
  --exclude='*.pyc' \
  --exclude='.DS_Store' \
  -C /path/to/zentria-crm . \
| ssh root@<HETZNER_IP> "mkdir -p /opt/zentria-crm && tar -xzf - -C /opt/zentria-crm"

# Copiar el .env de producción
scp .env root@<HETZNER_IP>:/opt/zentria-crm/.env

# Copiar zentria-config.js (landing)
scp landing/js/zentria-config.js root@<HETZNER_IP>:/opt/zentria-crm/landing/js/zentria-config.js
```

---

## Fase 4 — Actualizar zentria-config.js

En el archivo `landing/js/zentria-config.js`, cambiar el endpoint a la nueva IP:

```js
window.ZENTRIA_CONFIG = {
  apiKey: 'dev_key_change_in_production',
  endpoint: 'http://<HETZNER_IP>:3000',
  debug: false,
};
```

---

## Fase 5 — Levantar el stack en Hetzner

```bash
ssh root@<HETZNER_IP>
cd /opt/zentria-crm

# Red compartida
docker network create zentria-net

# Parchear NODE_ENV
python3 -c "
import re
with open('.env') as f: c = f.read()
c = re.sub(r'NODE_ENV=.*', 'NODE_ENV=production', c)
with open('.env','w') as f: f.write(c)
"

# Stack de tracking (postgres + redis + api)
docker compose --env-file .env -f docker-compose.yml up -d --build

# Stack Odoo + n8n
docker compose --env-file .env -f docker-compose.odoo.yml up -d

# Verificar que todo está en pie
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

---

## Fase 6 — Inicializar Odoo en Hetzner

La DB viene vacía. Inicializar el schema y los módulos:

```bash
# Crear red interna si no existe
docker network inspect zentria-crm_odoo-internal >/dev/null 2>&1 || true

# Init base
docker stop zentria-crm-odoo-1
docker exec zentria-crm-odoo-postgres-1 psql -U odoo -d postgres -c "DROP DATABASE IF EXISTS odoo; CREATE DATABASE odoo OWNER odoo;"

docker run --rm \
  --network zentria-crm_odoo-internal \
  -e HOST=odoo-postgres -e USER=odoo -e PASSWORD=<ODOO_DB_PASSWORD> \
  -v zentria-crm_odoo_data:/var/lib/odoo \
  -v /opt/zentria-crm/odoo/addons:/mnt/extra-addons \
  -v /opt/zentria-crm/odoo/odoo.conf:/etc/odoo/odoo.conf:ro \
  odoo:17.0 odoo -d odoo --init base --stop-after-init

# Instalar CRM + módulos
docker run --rm \
  --network zentria-crm_odoo-internal \
  -e HOST=odoo-postgres -e USER=odoo -e PASSWORD=<ODOO_DB_PASSWORD> \
  -v zentria-crm_odoo_data:/var/lib/odoo \
  -v /opt/zentria-crm/odoo/addons:/mnt/extra-addons \
  -v /opt/zentria-crm/odoo/odoo.conf:/etc/odoo/odoo.conf:ro \
  odoo:17.0 odoo -d odoo --init crm,contacts,mail --stop-after-init

docker compose -f docker-compose.odoo.yml start odoo
```

---

## Fase 7 — Re-importar workflow en n8n

Repetir el proceso de importación via API (ver `scripts/setup-n8n.sh` o documentación interna).

Credenciales n8n → `http://<HETZNER_IP>:5678`
- DB Host: `zentria-postgres`
- DB Name: `zentria_tracking`
- User: `zentria` / Password: según `.env`

---

## Fase 8 — Verificación final

```bash
# API de tracking
curl http://<HETZNER_IP>:3000/health

# Odoo
curl -I http://<HETZNER_IP>:8069

# n8n
curl -I http://<HETZNER_IP>:5678
```

Esperar a que los tres respondan 200 antes de continuar.

---

## Fase 9 — Cortar tráfico de GCP

Una vez que Hetzner está validado en producción:

1. Actualizar cualquier DNS, webhook o integración externa para apuntar a la nueva IP
2. Verificar que n8n recibe eventos y los procesa correctamente
3. Esperar al menos 24 horas de operación estable en Hetzner

---

## Fase 10 — Eliminar el proyecto en GCP

> ⚠️ Esta acción es **irreversible**. Asegurarte de que Hetzner está 100% operativo antes de proceder.

### Opción A — Eliminar solo los recursos (recomendado)

```bash
# Eliminar la VM
gcloud compute instances delete odoo-zentria-eu \
  --project=zentria-crm \
  --zone=europe-west1-b \
  --quiet

# Eliminar discos que puedan haber quedado sin asignar
gcloud compute disks list --project=zentria-crm
gcloud compute disks delete <DISK_NAME> --project=zentria-crm --zone=europe-west1-b --quiet

# Eliminar reglas de firewall custom
gcloud compute firewall-rules delete allow-zentria-api allow-n8n allow-odoo \
  --project=zentria-crm \
  --quiet
```

### Opción B — Eliminar el proyecto completo

```bash
gcloud projects delete zentria-crm
```

O desde la consola: [console.cloud.google.com/iam-admin/settings](https://console.cloud.google.com/iam-admin/settings) → seleccionar proyecto `zentria-crm` → **Shut down project**.

> El proyecto entra en período de gracia de 30 días antes de borrarse definitivamente. Durante ese período se puede restaurar.

---

## Checklist de migración

- [ ] Servidor Hetzner CX32 creado y accesible por SSH
- [ ] Docker instalado en Hetzner
- [ ] Proyecto transferido a `/opt/zentria-crm`
- [ ] Stack de tracking levantado y healthy
- [ ] Stack Odoo + n8n levantado
- [ ] Odoo inicializado con base + crm
- [ ] Workflow n8n importado y activo
- [ ] `GET /health` responde 200 en Hetzner
- [ ] `zentria-config.js` actualizado con nueva IP
- [ ] 24h de operación estable verificada
- [ ] Proyecto GCP eliminado o VM detenida
