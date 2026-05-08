#!/usr/bin/env bash
# Ejecutado en el servidor Hetzner por deploy-hetzner.sh
# No ejecutar directamente — usar deploy-hetzner.sh desde tu máquina local
set -euo pipefail

REMOTE_DIR="/opt/zentria-crm"
SERVER_IP=$(curl -sf --max-time 3 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')

GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; NC='\033[0m'
step() { echo -e "\n${BLUE}▶  $1${NC}"; }
ok()   { echo -e "${GREEN}✓  $1${NC}"; }
warn() { echo -e "${YELLOW}⚠  $1${NC}"; }

# ── Parar containers existentes (sin borrar volúmenes — preservar datos) ──
step "Deteniendo containers existentes"
docker compose --env-file "$REMOTE_DIR/.env" -f "$REMOTE_DIR/docker-compose.yml" down 2>/dev/null || true
docker compose --env-file "$REMOTE_DIR/.env" -f "$REMOTE_DIR/docker-compose.odoo.yml" down 2>/dev/null || true
ok "Containers detenidos"

# ── Limpiar imágenes viejas (no volúmenes — preservar datos de Odoo/postgres) ──
step "Limpiando imágenes sin usar"
docker image prune -f 2>/dev/null || true
ok "Imágenes limpiadas"

# ── Red zentria-net ──────────────────────────────────────────
step "Verificando red zentria-net"
docker network inspect zentria-net >/dev/null 2>&1 || docker network create zentria-net
ok "Red lista"

# ── Configurar NODE_ENV=production ──────────────────────────
step "Configurando entorno de producción"
python3 -c "
import re
path = '$REMOTE_DIR/.env'
with open(path) as f: content = f.read()
content = re.sub(r'NODE_ENV=.*', 'NODE_ENV=production', content)
with open(path, 'w') as f: f.write(content)
print('  NODE_ENV=production seteado')
"
chmod +x "$REMOTE_DIR/scripts/remote-setup.sh"
mkdir -p "$REMOTE_DIR/odoo/addons"
ok "Configuración lista"

# ── Stack tracking: postgres + redis + api ───────────────────
step "Levantando stack de tracking (postgres + redis + api)"
docker compose \
  --env-file "$REMOTE_DIR/.env" \
  -f "$REMOTE_DIR/docker-compose.yml" \
  up -d --build
ok "Stack de tracking levantado"

# ── Stack Odoo + n8n ─────────────────────────────────────────
step "Levantando stack Odoo + n8n"
docker compose \
  --env-file "$REMOTE_DIR/.env" \
  -f "$REMOTE_DIR/docker-compose.odoo.yml" \
  up -d
ok "Stack Odoo + n8n levantado"

# ── Aplicar migraciones de DB ────────────────────────────────
step "Aplicando migraciones de base de datos"
echo "  Esperando que postgres esté healthy..."
until docker exec zentria-postgres pg_isready -U zentria -d zentria_tracking -q 2>/dev/null; do
  sleep 2
done

for migration in "$REMOTE_DIR"/backend/src/db/migrations/*.sql; do
  filename=$(basename "$migration")
  docker exec -i zentria-postgres psql -U zentria -d zentria_tracking < "$migration" > /dev/null 2>&1 && \
    echo "  ✓ $filename" || \
    echo "  ~ $filename (ya aplicada o sin cambios)"
done
ok "Migraciones aplicadas"

# ── Health checks ────────────────────────────────────────────
step "Verificando salud de los servicios (esperar hasta 60s)"
deadline=$((SECONDS + 60))
api_ok=false
while [ $SECONDS -lt $deadline ]; do
  if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
    api_ok=true
    break
  fi
  sleep 3
done

if [ "$api_ok" = true ]; then
  ok "API de tracking responde"
else
  warn "API de tracking no respondió en 60s — revisar logs: docker logs zentria-api"
fi

# ── Status final ─────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  DEPLOY COMPLETADO — Hetzner ${SERVER_IP}    ${NC}"
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo ""
echo -e "${YELLOW}URLs disponibles:${NC}"
echo "  Backend API:  http://${SERVER_IP}:3000/health"
echo "  Odoo CRM:     http://${SERVER_IP}:8069"
echo "  n8n:          http://${SERVER_IP}:5678"
echo ""
echo -e "${YELLOW}Siguientes pasos:${NC}"
echo "  1. Importar workflow en n8n: http://${SERVER_IP}:5678"
echo "     Archivo: $REMOTE_DIR/n8n-workflows/odoo-lead-ingestion.json"
echo "  2. Activar el workflow 'Odoo Lead Ingestion'"
echo "  3. Agregar origen de producción en api_keys:"
echo "     INSERT INTO api_keys (key, customer_name, allowed_origins)"
echo "     VALUES ('tu_api_key_prod', 'Zentria', ARRAY['http://${SERVER_IP}:8082']);"
