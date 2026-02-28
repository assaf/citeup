#!/bin/bash

set -euo pipefail

source .env
echo "Seeding local database..."
pnpm prisma db seed

echo "Seeding production database..."
DATABASE_URL=$(doppler secrets get DIRECT_URL --plain)
pnpm prisma db seed

echo "Done."
