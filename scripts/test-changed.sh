#!/usr/bin/env bash

set -euo pipefail

BASE_REF="${1:-main}"
SPEC_PATTERN='(tests/e2e/.+\.(spec|test)\.(ts|js|tsx|jsx))$'

if git rev-parse --verify "origin/${BASE_REF}" >/dev/null 2>&1; then
  COMPARE_REF="origin/${BASE_REF}"
elif git rev-parse --verify "${BASE_REF}" >/dev/null 2>&1; then
  COMPARE_REF="${BASE_REF}"
else
  COMPARE_REF="HEAD~1"
fi

git diff --name-only "${COMPARE_REF}...HEAD" \
  | grep -E "${SPEC_PATTERN}" \
  | sed '/^$/d' \
  || true
