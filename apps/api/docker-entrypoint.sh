#!/bin/sh
set -e

cd /repo/apps/api

echo "[api] applying database schema..."
# db push is idempotent — works on first boot and subsequent boots without
# requiring a committed migrations folder. Perfect for a single-command demo.
pnpm exec prisma db push --skip-generate --accept-data-loss

echo "[api] starting NestJS..."
exec node dist/main
