#!/usr/bin/env bash
# ============================================================
#  deploy-to-gcp.sh — Deploy zentria-crm to GCP VM
#  VM   : odoo-zentria-eu  |  Project: zentria-crm
#  Zone : europe-west1-b   |  IP: 104.199.28.87
# ============================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
GCP_PROJECT="zentria-crm"
GCP_ZONE="europe-west1-b"
VM_NAME="odoo-zentria-eu"
REMOTE_DIR="/opt/zentria-crm"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
step() { echo -e "\n${BLUE}▶  $1${NC}"; }
ok()   { echo -e "${GREEN}✓  $1${NC}"; }
die()  { echo -e "${RED}✗  $1${NC}\n"; exit 1; }
ssh_run() { gcloud compute ssh "$VM_NAME" --project="$GCP_PROJECT" --zone="$GCP_ZONE" --quiet --command="$1"; }

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════╗"
echo "║      Zentria CRM — Deploy to GCP                ║"
echo "║      $VM_NAME (104.199.28.87)    ║"
echo "╚══════════════════════════════════════════════════╝${NC}"

# ── 0. Preflight ───────────────────────────────────────────
step "Preflight checks"
[ -f "$REPO_DIR/.env" ]                          || die ".env no encontrado. Copiá .env.example y completalo."
[ -f "$REPO_DIR/landing/js/zentria-config.js" ] || die "landing/js/zentria-config.js no encontrado."
command -v gcloud >/dev/null 2>&1               || die "gcloud no encontrado en PATH."
ok "Archivos locales presentes"

# ── 1. Build SDK ───────────────────────────────────────────
step "Construyendo SDK"
(cd "$REPO_DIR/sdk" && npm ci --silent && npm run build --silent)
cp "$REPO_DIR/sdk/dist/sdk.iife.js" "$REPO_DIR/landing/js/sdk.iife.js"
ok "sdk.iife.js → landing/js/"

# ── 2. Crear directorio remoto ─────────────────────────────
step "Preparando directorio remoto en la VM"
ssh_run "sudo mkdir -p /opt/zentria-crm && sudo chown \$USER:\$USER /opt/zentria-crm"
ok "Directorio /opt/zentria-crm listo"

# ── 3. Transferir proyecto vía tar | ssh ──────────────────
step "Transfiriendo proyecto (excluye node_modules, .git...)"

tar -czf - \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='sdk/dist' \
  --exclude='docs/node_modules' \
  --exclude='*.pyc' \
  --exclude='.DS_Store' \
  --exclude='playwright-report' \
  --exclude='test-results' \
  -C "$REPO_DIR" \
  . \
| gcloud compute ssh "$VM_NAME" \
    --project="$GCP_PROJECT" \
    --zone="$GCP_ZONE" \
    --quiet \
    -- "tar -xzf - -C /opt/zentria-crm" 2>&1 | grep -v 'LIBARCHIVE\|extended header' || true

ok "Proyecto transferido a /opt/zentria-crm"

# ── 4. Ejecutar script de setup remoto ────────────────────
step "Ejecutando remote-setup.sh en la VM"
ssh_run "chmod +x /opt/zentria-crm/scripts/remote-setup.sh && bash /opt/zentria-crm/scripts/remote-setup.sh"

ok "Deploy completado"
