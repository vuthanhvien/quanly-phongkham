#!/bin/bash
set -e

# ============================================================
# Config — đổi DOCKER_USER thành username Docker Hub của bạn
# ============================================================
DOCKER_USER="${DOCKER_USER:-vienvu}"
IMAGE_PREFIX="${DOCKER_USER}/quanly-phongkham"
TAG="${TAG:-latest}"
APP_IMAGE="${IMAGE_PREFIX}:${TAG}"

# ============================================================
echo "=> Docker user : $DOCKER_USER"
echo "=> Tag         : $TAG"
echo ""

# Đăng nhập Docker Hub
docker login

# Build app
echo ""
echo "[1/4] Building single app image..."
docker build \
  --platform linux/amd64 \
  --build-arg LANDING_API_URL="${LANDING_API_URL:-http://127.0.0.1:3001/api}" \
  --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-/api}" \
  --build-arg VITE_API_URL=/api \
  --build-arg VITE_BASE_PATH=/admin/ \
  -t "$APP_IMAGE" \
  .

# Push
echo ""
echo "[2/4] Pushing image..."
docker push "$APP_IMAGE"

echo ""
echo "[3/3] Done!"
echo ""
echo "Trên server chỉ cần file docker-compose.yml, rồi chạy:"
echo "  docker compose pull && docker compose up -d"
