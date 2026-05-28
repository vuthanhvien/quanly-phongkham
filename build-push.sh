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

# API dùng path tương đối vì cùng domain
VITE_API_URL="${VITE_API_URL:-/api}"

# ============================================================
echo "=> Docker user : $DOCKER_USER"
echo "=> Tag         : $TAG"
echo ""

# Đăng nhập Docker Hub
docker login

# Build backend
echo ""
echo "[1/4] Building backend..."
docker build \
  --platform linux/amd64 \
  -t "$BACKEND_IMAGE" \
  ./backend

# Build CMS
echo ""
echo "[2/4] Building cms..."
docker build \
  --platform linux/amd64 \
  --build-arg VITE_API_URL="$VITE_API_URL" \
  -t "$CMS_IMAGE" \
  ./cms

# Push
echo ""
echo "[3/4] Pushing backend..."
docker push "$BACKEND_IMAGE"

echo ""
echo "[4/4] Pushing cms..."
docker push "$CMS_IMAGE"

echo ""
echo "Done!"
echo ""
echo "Pull về máy khác:"
echo "  docker pull $BACKEND_IMAGE"
echo "  docker pull $CMS_IMAGE"
