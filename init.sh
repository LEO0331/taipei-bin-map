#!/bin/bash
set -euo pipefail

SERVER_PID=""

cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT

echo "=== Harness Initialization ==="

echo "=== npm test ==="
npm test

echo "=== npm run build ==="
npm run build

echo "=== Start local dev server for smoke test ==="
npm run dev -- --host 127.0.0.1 --port 5173 >/tmp/taipei-bin-map-vite.log 2>&1 &
SERVER_PID=$!

for _ in {1..30}; do
  if curl -sS http://127.0.0.1:5173/ >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -sS http://127.0.0.1:5173/ >/dev/null 2>&1; then
  echo "Vite server did not become ready. Log:"
  tail -40 /tmp/taipei-bin-map-vite.log || true
  exit 1
fi

echo "=== node tools/smoke-test.mjs ==="
node tools/smoke-test.mjs

echo "=== Verification Complete ==="
echo ""
echo "Next steps:"
echo "1. Read feature_list.json to see current feature state"
echo "2. Pick ONE unfinished feature to work on"
echo "3. Implement only that feature"
echo "4. Re-run ./init.sh before claiming done"
