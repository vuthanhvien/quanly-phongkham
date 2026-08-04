#!/bin/bash
set -euo pipefail

PUSH=false
NO_CACHE=false

usage() {
  cat <<'EOF'
Usage: ./build-demo.sh [options]

Build the Docker runtime image using .env.demo.

Options:
  --push       Push the built image after building.
  --no-cache   Build without Docker layer cache.
  -h, --help   Show this help message.

Examples:
  ./build-demo.sh
  ./build-demo.sh --push
  DEMO_TAG=demo-20260804 ./build-demo.sh --push
  DEMO_IMAGE_PREFIX=vienvu/gis-clinic-demo DEMO_TAG=demo ./build-demo.sh
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --push) PUSH=true ;;
    --no-cache) NO_CACHE=true ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

ENV_FILE="${ENV_FILE:-.env.demo}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing environment file: $ENV_FILE" >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

DOCKER_USER="${DOCKER_USER:-vienvu}"
IMAGE_PREFIX="${DEMO_IMAGE_PREFIX:-${IMAGE_PREFIX:-${DOCKER_USER}/gis-clinic-demo}}"
TAG="${DEMO_TAG:-demo}"
APP_IMAGE="${IMAGE_PREFIX}:${TAG}"

BUILD_ARGS=(
  --platform linux/amd64
  --build-arg "LANDING_API_URL=http://127.0.0.1:9998/api"
  --build-arg "NEXT_PUBLIC_API_URL=${PUBLIC_API_URL:?Set PUBLIC_API_URL in .env.demo, e.g. http://demo.example.com:9998/api}"
  --build-arg "VITE_API_URL=${PUBLIC_API_URL:?Set PUBLIC_API_URL in .env.demo, e.g. http://demo.example.com:9998/api}"
  --build-arg "VITE_BASE_PATH=/"
  --build-arg "VITE_LANDING_URL=${LANDING_PUBLIC_URL:-}"
  -t "$APP_IMAGE"
)

if [[ "$NO_CACHE" == true ]]; then
  BUILD_ARGS+=(--no-cache)
fi

echo "=> Env file : $ENV_FILE"
echo "=> Image    : $APP_IMAGE"
echo "=> API URL  : $PUBLIC_API_URL"
echo "=> Landing  : ${LANDING_PUBLIC_URL:-}"
echo "=> Push     : $PUSH"
echo ""

docker build "${BUILD_ARGS[@]}" .

if [[ "$PUSH" == true ]]; then
  echo ""
  echo "=> Pushing $APP_IMAGE..."
  docker push "$APP_IMAGE"
fi

echo ""
echo "=> Demo image build completed: $APP_IMAGE"
