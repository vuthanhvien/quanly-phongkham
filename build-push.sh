#!/bin/bash
set -e

# ============================================================
# Config — đổi DOCKER_USER thành username Docker Hub của bạn
# ============================================================
DOCKER_USER="${DOCKER_USER:-vienvu}"
IMAGE_PREFIX="${DOCKER_USER}/quanly-phongkham"
TAG="${TAG:-latest}"
APP_IMAGE="${IMAGE_PREFIX}:${TAG}"
DEPLOY_HOST="${DEPLOY_HOST:-root@103.1.238.70}"
DEPLOY_DIR="${DEPLOY_DIR:-clinic}"

# ============================================================
echo "=> Docker user : $DOCKER_USER"
echo "=> Tag         : $TAG"
echo ""

# Đăng nhập Docker Hub
docker login

# Build app
echo ""
echo "[1/3] Building single app image..."
docker build \
  --platform linux/amd64 \
  --build-arg LANDING_API_URL="${LANDING_API_URL:-http://127.0.0.1:3001/api}" \
  --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-/api}" \
  --build-arg VITE_API_URL="${VITE_API_URL:-/api}" \
  --build-arg VITE_BASE_PATH="${VITE_BASE_PATH:-/admin/}" \
  --build-arg VITE_LANDING_URL="${VITE_LANDING_URL:-}" \
  -t "$APP_IMAGE" \
  .

# Push
echo ""
echo "[2/3] Pushing image..."
docker push "$APP_IMAGE"

echo ""
echo "[3/3] Deploying to $DEPLOY_HOST..."
ssh "$DEPLOY_HOST" "
  set -e
  echo '[server] Connected to \$(hostname)'
  cd '$DEPLOY_DIR'
  echo '[server] Pulling Docker image...'
  docker compose pull
  echo '[server] Starting containers...'
  docker compose up -d
  echo '[server] Container status:'
  docker compose ps
  echo '[server] Deploy succeeded.'
"

echo ""
echo "=> Build, push, and server deploy completed successfully."
