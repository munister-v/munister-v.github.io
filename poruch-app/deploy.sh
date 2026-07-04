#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Syncing poruch-app/ to VPS (excluding .env, uploads, node_modules)..."
rsync -avz --delete \
  -e "ssh -i ~/.ssh/maniagroup_deploy" \
  "$SCRIPT_DIR/" \
  root@173.242.49.73:/opt/poruch-app/ \
  --exclude=".env" \
  --exclude="uploads" \
  --exclude="node_modules" \
  --exclude=".git"

echo "Rebuilding and restarting the container..."
ssh -i ~/.ssh/maniagroup_deploy root@173.242.49.73 \
  "cd /opt/poruch-app && docker compose up -d --build && sleep 3 && curl -fsS http://127.0.0.1:3100/readyz"

echo "✓ poruch-app deployed and healthy"
