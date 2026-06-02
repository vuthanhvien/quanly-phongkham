#!/bin/bash
set -e

# ============================================================
# Config — đổi DOCKER_USER thành username Docker Hub của bạn
# ============================================================
DOCKER_USER="${DOCKER_USER:-vienvu}"
IMAGE_PREFIX="${DOCKER_USER}/quanly-phongkham"
TAG="${TAG:-latest}"

BACKEND_IMAGE="${IMAGE_PREFIX}-backend:${TAG}"
CMS_IMAGE="${IMAGE_PREFIX}-cms:${TAG}"
PROXY_IMAGE="${IMAGE_PREFIX}-proxy:${TAG}"
LANDING_IMAGE="${IMAGE_PREFIX}-landing:${TAG}"

# ============================================================
echo "=> Docker user : $DOCKER_USER"
echo "=> Tag         : $TAG"
echo ""

# Đăng nhập Docker Hub
docker login

# Build backend
echo ""
echo "[1/6] Building backend..."
docker build \
  --platform linux/amd64 \
  -t "$BACKEND_IMAGE" \
  ./backend

# Build CMS
echo ""
echo "[2/6] Building cms..."
docker build \
  --platform linux/amd64 \
  --build-arg VITE_API_URL=/api \
  -t "$CMS_IMAGE" \
  ./cms

# Build proxy
echo ""
echo "[3/6] Building landing..."
docker build \
  --platform linux/amd64 \
  -t "$LANDING_IMAGE" \
  ./landing

# Build proxy
echo ""
echo "[4/6] Building proxy..."
docker build \
  --platform linux/amd64 \
  -t "$PROXY_IMAGE" \
  ./proxy

# Push
echo ""
echo "[5/6] Pushing images..."
docker push "$BACKEND_IMAGE"
docker push "$CMS_IMAGE"
docker push "$LANDING_IMAGE"
docker push "$PROXY_IMAGE"

echo ""
echo "[6/6] Done!"
echo ""
echo "Trên server chỉ cần file docker-compose.yml, rồi chạy:"
echo "  docker compose pull && docker compose up -d"
