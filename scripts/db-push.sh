#!/bin/bash

set -euo pipefail

export DIRECT_URL=$(doppler --config prd secrets get DIRECT_URL --plain)

echo "Updating production database..."
pnpm prisma db push --url "$DIRECT_URL"

echo "Done."
