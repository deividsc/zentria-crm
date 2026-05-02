#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── 1. Require .env ────────────────────────────────────────────────────────────
if [ ! -f "$REPO_DIR/.env" ]; then
  echo "ERROR: .env not found. Copy .env.example and fill in your values:"
  echo "  cp .env.example .env"
  exit 1
fi

# ── 2. Build SDK ───────────────────────────────────────────────────────────────
echo "→ Building SDK..."
(cd "$REPO_DIR/sdk" && npm ci --silent && npm run build --silent)
cp "$REPO_DIR/sdk/dist/sdk.iife.js" "$REPO_DIR/landing/js/sdk.iife.js"
echo "  SDK built and copied to landing/js/sdk.iife.js"

# ── 3. Require landing config ─────────────────────────────────────────────────
if [ ! -f "$REPO_DIR/landing/js/zentria-config.js" ]; then
  echo "ERROR: landing/js/zentria-config.js not found. Copy the example and fill in your values:"
  echo "  cp landing/js/zentria-config.example.js landing/js/zentria-config.js"
  exit 1
fi

# ── 4. Docker network ──────────────────────────────────────────────────────────
if ! docker network inspect zentria-net &>/dev/null; then
  echo "→ Creating Docker network zentria-net..."
  docker network create zentria-net
fi

# ── 5. Start tracking stack ───────────────────────────────────────────────────
echo "→ Starting tracking stack (postgres, redis, api)..."
docker compose --env-file "$REPO_DIR/.env" -f "$REPO_DIR/docker-compose.yml" up -d --build

# ── 6. Start Odoo + n8n stack ─────────────────────────────────────────────────
echo "→ Starting Odoo + n8n stack..."
docker compose --env-file "$REPO_DIR/.env" -f "$REPO_DIR/docker-compose.odoo.yml" up -d

echo ""
echo "✓ Stack started."
echo ""
echo "Next steps:"
echo "  • Import n8n workflows via the UI at http://<your-vps>:5678"
echo "    or run:  bash scripts/import-n8n-workflows.sh"
echo "  • Serve the landing/ directory with nginx or any static file server."
