# Kanban Board — Docker Deployment

Run the entire stack (Postgres + NestJS API + React web) with **one command, zero local dependencies**. Only Docker Desktop is required on the host.

## Quick start (boss demo)

```bash
docker compose up --build
```

That's it. Wait for build to finish (~3–5 min on first run, seconds afterwards), then open:

- **App:** http://localhost:8080
- **API:** http://localhost:3001/api

## What's included

| Service | Image                 | Host port | Purpose                                |
| ------- | --------------------- | --------- | -------------------------------------- |
| `db`    | postgres:16-alpine    | 5432      | App database (named volume `db_data`)  |
| `api`   | built from `apps/api` | 3001      | NestJS REST API + Prisma               |
| `web`   | built from `apps/web` | 8080      | nginx serving Vite build, proxies /api |

The frontend talks to the API through nginx's `/api/*` proxy on the same origin, so there are no CORS issues and no host-port juggling for the demo.

## How it boots

1. `db` starts; healthcheck waits for Postgres to accept connections.
2. `api` waits for `db` to be healthy, runs `prisma db push` (idempotent — creates the schema on first boot, no-ops afterwards), then starts NestJS.
3. `web` serves the production Vite bundle and proxies `/api/*` to `api:3001`.

## Defaults

All config is baked in. You don't need a `.env` file:

| Variable        | Default                                            |
| --------------- | -------------------------------------------------- |
| `DATABASE_URL`  | `postgresql://kanban:kanban@db:5432/kanban`        |
| `JWT_SECRET`    | `demo-secret-do-not-use-in-production-9c7f2e0a`    |
| `WEB_ORIGIN`    | `http://localhost:8080`                            |
| Pusher creds    | empty — realtime broadcasts disabled (logs a warn) |
| OAuth creds     | unset — Google/Microsoft buttons return 4xx        |

For a real environment, override these in `docker-compose.yml` or via a `.env` next to it.

## Common commands

```bash
# Foreground (logs in terminal)
docker compose up --build

# Background
docker compose up -d --build

# Stop services
docker compose down

# Stop + delete the database
docker compose down -v

# Tail logs
docker compose logs -f api
docker compose logs -f web

# Reset only the database
docker compose down -v && docker compose up -d
```

## Troubleshooting

**Port 3001 or 8080 already in use** — something else on your host is listening (often a local dev server). Stop it, or change the host-side mapping in `docker-compose.yml`:

```yaml
ports:
  - "3002:3001"   # access API at host :3002 instead
```

**API container restarts on boot** — `docker compose logs api` shows the error. Most likely the Postgres credentials or `DATABASE_URL` were edited mid-flight; run `docker compose down -v` to start fresh.

**Slow first build** — pnpm has to download ~800 packages. Subsequent builds use the layer cache and complete in seconds.
