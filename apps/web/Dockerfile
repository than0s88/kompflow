# syntax=docker/dockerfile:1.7

# ---------- base ----------
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /repo

# ---------- deps ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

# ---------- build ----------
FROM deps AS build
COPY packages/shared packages/shared
COPY apps/web apps/web
# VITE_API_URL is empty so the bundled JS calls /api/* relative to origin —
# nginx then proxies /api -> api:3001 inside the docker network.
ENV VITE_API_URL=""
ARG VITE_PUSHER_KEY=""
ARG VITE_PUSHER_CLUSTER=""
ENV VITE_PUSHER_KEY=$VITE_PUSHER_KEY
ENV VITE_PUSHER_CLUSTER=$VITE_PUSHER_CLUSTER
RUN pnpm --filter @kanban/shared build
RUN pnpm --filter @kanban/web build

# ---------- runtime (nginx) ----------
FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
