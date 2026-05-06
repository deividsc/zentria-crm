#!/usr/bin/env bash
# Ejecutado en la VM remota por deploy-to-gcp.sh
set -euo pipefail

REMOTE_DIR="/opt/zentria-crm"

GREEN='\033[0;32m'; BLUE='\033[0;34m'; NC='\033[0m'
step() { echo -e "\n${BLUE}▶  $1${NC}"; }
ok()   { echo -e "${GREEN}✓  $1${NC}"; }

# ── Limpiar todo lo anterior ───────────────────────────────
step "Deteniendo y eliminando containers existentes"
docker ps -aq 2>/dev/null | xargs -r docker rm -f 2>/dev/null || true
ok "Containers eliminados"

step "Limpiando imágenes, volúmenes y redes"
docker system prune -af --volumes 2>/dev/null || true
ok "Docker limpio"

# ── Red zentria-net ────────────────────────────────────────
step "Creando red zentria-net"
docker network inspect zentria-net >/dev/null 2>&1 || docker network create zentria-net
ok "Red lista"

# ── Configuración de producción ────────────────────────────
step "Configurando entorno de producción"
python3 -c "
import re
path = '$REMOTE_DIR/.env'
with open(path) as f: content = f.read()
content = re.sub(r'NODE_ENV=.*', 'NODE_ENV=production', content)
with open(path, 'w') as f: f.write(content)
print('  NODE_ENV=production seteado')
"
chmod +x "$REMOTE_DIR/deploy.sh" 2>/dev/null || true
chmod +x "$REMOTE_DIR/scripts/remote-setup.sh" 2>/dev/null || true
mkdir -p "$REMOTE_DIR/odoo/addons"
ok "Configuración lista"

# ── Stack tracking: postgres + redis + api ─────────────────
step "Levantando stack de tracking (postgres + redis + api)"
docker compose \
  --env-file "$REMOTE_DIR/.env" \
  -f "$REMOTE_DIR/docker-compose.yml" \
  up -d --build
ok "Stack de tracking levantado"

# ── Stack Odoo + n8n ───────────────────────────────────────
step "Levantando stack Odoo + n8n"
docker compose \
  --env-file "$REMOTE_DIR/.env" \
  -f "$REMOTE_DIR/docker-compose.odoo.yml" \
  up -d
ok "Stack Odoo + n8n levantado"

# ── Esperar que los servicios estén healthy ────────────────
step "Esperando servicios (30s)"
sleep 30

# ── Status final ───────────────────────────────────────────
EXTERNAL_IP=$(curl -sf --max-time 3 \
  http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip \
  -H 'Metadata-Flavor: Google' 2>/dev/null || echo '104.199.28.87')

echo ""
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo -e "${GREEN}  DEPLOY COMPLETADO                      ${NC}"
echo -e "${GREEN}══════════════════════════════════════════${NC}"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo ""
echo -e "\033[1;33mURLs disponibles:\033[0m"
echo "  Backend API:  http://${EXTERNAL_IP}:3000/health"
echo "  Odoo CRM:     http://${EXTERNAL_IP}:8069"
echo "  n8n:          http://${EXTERNAL_IP}:5678"
echo ""
echo -e "\033[1;33mSiguientes pasos:\033[0m"
echo "  1. Importar workflow en n8n: http://${EXTERNAL_IP}:5678"
echo "     Archivo: $REMOTE_DIR/n8n-workflows/odoo-lead-ingestion.json"
echo "  2. Activar el workflow 'Odoo Lead Ingestion'"
echo "  3. Setup inicial de Odoo en http://${EXTERNAL_IP}:8069"
