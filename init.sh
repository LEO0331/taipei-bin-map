#!/bin/bash
set -euo pipefail

echo "=== Harness Initialization ==="

echo "=== npm test ==="
npm test

echo "=== npm run build ==="
npm run build

echo "=== npm run test:e2e ==="
npm run test:e2e

echo "=== Verification Complete ==="
echo ""
echo "Next steps:"
echo "1. Read feature_list.json to see current feature state"
echo "2. Pick ONE unfinished feature to work on"
echo "3. Implement only that feature"
echo "4. Re-run ./init.sh before claiming done"
