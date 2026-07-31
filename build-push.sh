#!/bin/bash
set -e

# Nạp cấu hình production. Có thể đổi bằng ENV_FILE=/path/to/file.
ENV_FILE="${ENV_FILE:-.env.production}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing environment file: $ENV_FILE" >&2
  exit 1
fi
set -a
source "$ENV_FILE"
set +a

# ============================================================
# Config — đổi DOCKER_USER thành username Docker Hub của bạn
# ============================================================
DOCKER_USER="${DOCKER_USER:-vienvu}"
IMAGE_PREFIX="${DOCKER_USER}/gis-clinic"
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

# Build one runtime image. The three apps are exposed on ports 9997–9999.
echo ""
echo "[1/3] Building gis-clinic image..."
docker build \
  --platform linux/amd64 \
  --build-arg LANDING_API_URL="http://127.0.0.1:9998/api" \
  --build-arg NEXT_PUBLIC_API_URL="${PUBLIC_API_URL:?Set PUBLIC_API_URL, e.g. https://api.example.com/api}" \
  --build-arg VITE_API_URL="${PUBLIC_API_URL:?Set PUBLIC_API_URL, e.g. https://api.example.com/api}" \
  --build-arg VITE_BASE_PATH="/" \
  --build-arg VITE_LANDING_URL="${LANDING_PUBLIC_URL:-}" \
  -t "$APP_IMAGE" \
  .

# Push
echo ""
echo "[2/3] Pushing image..."
docker push "$APP_IMAGE"

echo ""
echo "[3/3] Deploying to $DEPLOY_HOST..."
echo '[3/3] Uploading deployment configuration...'
ssh "$DEPLOY_HOST" "mkdir -p '$DEPLOY_DIR'"
scp docker-compose.yml "$DEPLOY_HOST:$DEPLOY_DIR/docker-compose.yml"
scp "$ENV_FILE" "$DEPLOY_HOST:$DEPLOY_DIR/.env"
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
