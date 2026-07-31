#!/bin/bash
set -euo pipefail

UPLOAD_ENV=false
UPLOAD_COMPOSE=false

usage() {
  cat <<'EOF'
Usage: ./deploy.sh [options]

Build, push, and deploy the Docker image. The server's existing Docker Compose
and environment files are preserved by default.

Options:
  --upload-env       Upload ENV_FILE to the server as .env.
  --upload-compose   Upload docker-compose.yml to the server.
  -h, --help         Show this help message.

Examples:
  ./deploy.sh
  ./deploy.sh --upload-env --upload-compose
  ENV_FILE=.env.staging ./deploy.sh --upload-env
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --upload-env) UPLOAD_ENV=true ;;
    --upload-compose) UPLOAD_COMPOSE=true ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

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
echo "=> Upload env  : $UPLOAD_ENV"
echo "=> Upload compose: $UPLOAD_COMPOSE"
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
ssh "$DEPLOY_HOST" "mkdir -p '$DEPLOY_DIR'"
if [[ "$UPLOAD_COMPOSE" == true ]]; then
  echo '[3/3] Uploading docker-compose.yml...'
  scp docker-compose.yml "$DEPLOY_HOST:$DEPLOY_DIR/docker-compose.yml"
fi
if [[ "$UPLOAD_ENV" == true ]]; then
  echo '[3/3] Uploading environment file...'
  scp "$ENV_FILE" "$DEPLOY_HOST:$DEPLOY_DIR/.env"
fi
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
