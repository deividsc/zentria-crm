#!/usr/bin/env bash
# Deploy a Hetzner desde tu máquina local
# Uso: ./scripts/deploy-hetzner.sh
set -euo pipefail

HETZNER_IP="23.88.103.29"
REMOTE_USER="root"
REMOTE_DIR="/opt/zentria-crm"
SSH_TARGET="${REMOTE_USER}@${HETZNER_IP}"

GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
step() { echo -e "\n${BLUE}▶  $1${NC}"; }
ok()   { echo -e "${GREEN}✓  $1${NC}"; }
warn() { echo -e "${YELLOW}⚠  $1${NC}"; }
die()  { echo -e "${RED}✗  $1${NC}"; exit 1; }

# ── Verificar que estamos en la raíz del repo ────────────────
if [ ! -f "docker-compose.yml" ]; then
  die "Ejecutar desde la raíz del repo zentria-crm"
fi

# ── Verificar que .env de producción existe ──────────────────
if [ ! -f ".env" ]; then
  die ".env no encontrado — copiá .env.example y completá los valores"
fi

# ── Verificar que zentria-config.js existe ───────────────────
if [ ! -f "landing/js/zentria-config.js" ]; then
  die "landing/js/zentria-config.js no encontrado — copiá zentria-config.example.js y completá los valores"
fi

# ── Verificar conexión SSH ───────────────────────────────────
step "Verificando conexión SSH con ${HETZNER_IP}"
ssh -o ConnectTimeout=10 -o BatchMode=yes "${SSH_TARGET}" "echo ok" > /dev/null 2>&1 || \
  die "No se puede conectar a ${SSH_TARGET} — verificar SSH key y firewall"
ok "Conexión SSH OK"

# ── Transferir el proyecto ───────────────────────────────────
step "Transfiriendo proyecto a ${REMOTE_DIR}"
ssh "${SSH_TARGET}" "mkdir -p ${REMOTE_DIR}/landing/js"

tar -czf - \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='sdk/dist' \
  --exclude='backend/dist' \
  --exclude='*.pyc' \
  --exclude='.DS_Store' \
  --exclude='playwright-report' \
  --exclude='test-results' \
  --exclude='.claude' \
  . | ssh "${SSH_TARGET}" "tar -xzf - -C ${REMOTE_DIR}"

ok "Proyecto transferido"

# ── Copiar archivos ignorados por git ────────────────────────
step "Copiando archivos de configuración local"
scp .env "${SSH_TARGET}:${REMOTE_DIR}/.env"
scp landing/js/zentria-config.js "${SSH_TARGET}:${REMOTE_DIR}/landing/js/zentria-config.js"
ok "Configuración copiada"

# ── Ejecutar setup remoto ────────────────────────────────────
step "Ejecutando setup en el servidor"
ssh "${SSH_TARGET}" "chmod +x ${REMOTE_DIR}/scripts/remote-setup.sh && ${REMOTE_DIR}/scripts/remote-setup.sh"

echo ""
ok "Deploy a Hetzner completado"
echo -e "${YELLOW}Landing page:  http://${HETZNER_IP}:8082${NC}"
