#!/usr/bin/env bash

set -euo pipefail

MODE="${1:-full}"
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"

pnpm typecheck
pnpm build
mkdir -p .data/db
NITRO_HOST=127.0.0.1 NITRO_PORT=3000 node .output/server/index.mjs > /tmp/cadet2-ci-local-preview.log 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
}

trap cleanup EXIT

for attempt in {1..60}; do
  if curl --silent --fail "$BASE_URL" > /dev/null; then
    break
  fi
  sleep 2
done

curl --silent --fail "$BASE_URL" > /dev/null

case "$MODE" in
  smoke)
    pnpm test:e2e -- tests/e2e/example.spec.ts
    ;;
  burn-in)
    shift || true
    ./scripts/burn-in.sh "${1:-10}" "${@:2}"
    ;;
  changed)
    shift || true
    mapfile -t CHANGED_SPECS < <(./scripts/test-changed.sh "${1:-main}")
    if [ "${#CHANGED_SPECS[@]}" -eq 0 ]; then
      ./scripts/burn-in.sh 1
    else
      ./scripts/burn-in.sh 1 "${CHANGED_SPECS[@]}"
    fi
    ;;
  full)
    pnpm test:e2e
    ;;
  *)
    echo "Unknown mode: ${MODE}" >&2
    echo "Supported modes: full, smoke, burn-in, changed" >&2
    exit 1
    ;;
esac
