# Kanban Board

A real-time, multi-user Kanban board. TypeScript everywhere — NestJS API, React SPA, shared types.

## Stack

- **API:** NestJS 11 + Prisma + PostgreSQL (Neon) + JWT auth + Pusher broadcasting
- **Web:** React 19 + Vite + TypeScript + Tailwind + dnd-kit + React Query + React Router
- **Shared:** TypeScript DTOs and types (`packages/shared`)
- **Tooling:** pnpm workspaces + Turborepo

## Layout

```
kanban-board/
├── apps/
│   ├── api/        # NestJS backend
│   └── web/        # React frontend
├── packages/
│   └── shared/     # Shared TS types/DTOs
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Prerequisites

- Node.js 22+
- pnpm 10+
- A Postgres database (we use Neon free tier)
- A Pusher account (free tier — for real-time updates)

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Fill in DATABASE_URL, JWT_SECRET, and Pusher credentials in both

# 3. Generate Prisma client + run migrations
pnpm --filter @kanban/api exec prisma generate
pnpm --filter @kanban/api exec prisma migrate deploy

# 4. Run both apps in dev mode
pnpm dev
```

- API runs at http://localhost:3001
- Web runs at http://localhost:5173

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Run all apps in dev (Turborepo) |
| `pnpm build` | Build all apps |
| `pnpm lint` | Lint all workspaces |
| `pnpm test` | Run all tests |
| `pnpm format` | Format with Prettier |

## Architecture notes

- **Auth:** JWT in HTTP-only cookies. NestJS issues, React reads via cookie automatically.
- **Authorization:** `BoardMember` pivot table with `owner | editor | viewer` roles.
- **Real-time:** Any mutation broadcasts a `board.updated` event on a private Pusher channel `private-board-{id}`. The web app listens and refetches.
- **Drag-and-drop:** dnd-kit with optimistic updates; on drop, the client posts a single atomic reorder request that the server applies in one transaction.
