# syntax=docker/dockerfile:1.7

# ---------- base ----------
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
RUN apk add --no-cache openssl libc6-compat
WORKDIR /repo

# ---------- deps (full install — cached layer) ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

# ---------- build ----------
FROM deps AS build
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @kanban/shared build
# Generate Prisma Client into the workspace .pnpm store (TS types for build).
RUN pnpm --filter @kanban/api exec prisma generate
RUN pnpm --filter @kanban/api build

# ---------- runtime ----------
# Reuse the build stage as runtime — keeps the existing pnpm symlink layout
# intact so @prisma/client + generated .prisma/client + prisma CLI all resolve
# without any extra hops or store copying.
FROM build AS runtime
ENV NODE_ENV=production
WORKDIR /repo/apps/api

EXPOSE 3001

# Inline boot sequence:
#   1. Apply Prisma schema with db push (idempotent — re-running is safe).
#   2. Launch the NestJS server.
# Inlined here instead of using a shell script so Windows hosts don't trip on
# CRLF line endings in a checked-in *.sh file.
CMD ["sh", "-c", "echo '[api] applying database schema...' && pnpm exec prisma db push --skip-generate --accept-data-loss && echo '[api] starting NestJS...' && exec node dist/main"]
