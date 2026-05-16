#!/bin/bash
set -e

echo "========================================="
echo "  ServerManager - One-Click Deployment"
echo "========================================="

check_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "[ERROR] '$1' is required but not installed."
    exit 1
  }
}

check_cmd docker
check_cmd openssl

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "[ERROR] Docker Compose not found."
  exit 1
fi

if [ ! -f .env ]; then
  echo "[INFO] Generating .env..."
  cat > .env <<EOF
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -hex 16)
PORT=3200
DATABASE_URL=file:/app/data/server-manager.db
EOF
  echo "[OK] .env generated."
else
  echo "[INFO] .env already exists, skipping."
fi

echo "[INFO] Building images and starting containers..."
$COMPOSE up -d --build

echo ""
echo "========================================="
echo "  Deployment Complete!"
echo "  Visit: http://localhost"
echo "========================================="
