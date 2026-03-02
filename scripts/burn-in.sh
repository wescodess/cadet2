#!/usr/bin/env bash

set -euo pipefail

ITERATIONS="${1:-10}"
shift || true

TARGET_ARGS=("$@")

if [ "${#TARGET_ARGS[@]}" -eq 0 ]; then
  TARGET_DESC="full Playwright suite"
  CMD=(pnpm test:e2e)
else
  TARGET_DESC="${#TARGET_ARGS[@]} changed spec(s)"
  CMD=(pnpm test:e2e -- "${TARGET_ARGS[@]}")
fi

echo "Running burn-in against ${TARGET_DESC} for ${ITERATIONS} iterations."

for ((iteration = 1; iteration <= ITERATIONS; iteration++)); do
  echo "Burn-in iteration ${iteration}/${ITERATIONS}"
  "${CMD[@]}"
done
