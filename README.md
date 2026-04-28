# Kompflow

A Trello-style kanban app with workspaces, boards, drag-and-drop cards, and a live activity feed. The whole stack — Postgres, NestJS API, React web, Pusher-compatible realtime server — boots from a single `docker compose up`.

> **For reviewers:** clone this repo, run `docker compose up --build`, open `http://localhost:5173`, register an account, and you're in. No `.env` file, no local Node/pnpm/Postgres install required. Only Docker Desktop.

---

## Quick start

```bash
git clone https://github.com/than0s88/kompflow.git
cd kompflow
docker compose up --build
```

First build takes 3–5 minutes (downloads Node + Postgres + Soketi base images, installs ~800 packages, compiles the API and web bundle). Subsequent boots take seconds.

When build finishes, open:

- **App:** http://localhost:5173
- **API:** http://localhost:3001/api (returns 404 directly — that's normal; auth-protected routes live under it)

To stop the stack: `Ctrl+C`. To wipe the database between runs: `docker compose down -v`.

---

## What the demo flow looks like

1. Open http://localhost:5173 → click **Sign up** → create an account.
2. The app auto-creates a personal workspace (`<your name>'s Workspace`). It shows up in the left sidebar.
3. Click **+ New board** in the workspace view (or in the dashboard) to create a board. Three default columns (`To Do`, `In Progress`, `Done`) are seeded automatically.
4. Add cards. Drag them between columns. Open a card to edit it (markdown supported, image embedding supported).
5. Click **🕒 Activity** in the board header — see every move/add/update logged in a Trello-style timeline.
6. From the sidebar, switch to **Activity** for the workspace-wide feed.
7. Use the workspace switcher (top of the sidebar) → **+ Create workspace** to make a second workspace, then create boards in it.
8. From the sidebar, click **🏠 All boards** to see every board across every workspace, grouped.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│ Browser  http://localhost:5173                                       │
└────────────┬─────────────────────────────┬───────────────────────────┘
             │ HTTP                        │ WebSocket
             │                             │
             ▼                             ▼
┌────────────────────────┐    ┌─────────────────────────┐
│ web (nginx)            │    │ soketi                  │
│ static React bundle    │    │ Pusher-compatible WS    │
│ port 80 → host 5173    │    │ port 6001 → host 6001   │
└────────┬───────────────┘    └─────────────▲───────────┘
         │ /api/* via                       │
         │ direct calls to localhost:3001   │ trigger
         │                                  │
         ▼                                  │
┌────────────────────────┐    ┌─────────────┴───────────┐
│ api (NestJS)           │───▶│ activity broadcasts     │
│ port 3001 → host 3001  │    │ on workspace + board    │
│  - JwtAuthGuard        │    │ private channels        │
│  - Prisma db push on   │    └─────────────────────────┘
│    boot (idempotent)   │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐
│ db (Postgres 16)       │
│ kompflow / kompflow    │
│ named volume db_data   │
└────────────────────────┘
```

| Service  | Image                       | Host port | Purpose                                                                    |
| -------- | --------------------------- | --------- | -------------------------------------------------------------------------- |
| `db`     | `postgres:16-alpine`        | (none)    | App database. Schema applied via `prisma db push` on every API boot.       |
| `soketi` | `quay.io/soketi/soketi:1.6` | 6001      | Self-hosted Pusher-compatible WebSocket server for the live activity feed. |
| `api`    | built from `apps/api`       | 3001      | NestJS REST API + Prisma. Logs every workspace/board/column/card mutation. |
| `web`    | built from `apps/web`       | 5173      | nginx serving the React SPA. Bundle is built with `VITE_API_URL` baked in. |

---

## Features

### Workspaces
- Create/list/rename workspaces. Two visibility modes: `private` and `workspace-public`.
- A personal workspace is auto-created on registration so users land in a usable state.
- Boards live inside workspaces — switch between workspaces from the sidebar.

### Boards
- Create boards within a workspace. Three default columns are seeded inside a transaction.
- Drag cards between columns. Drag columns to reorder.
- The reorder endpoint accepts a single atomic payload that updates positions in one DB transaction.
- Per-card detail modal with markdown, image embedding, and (optional, per-board) end-to-end-encrypted descriptions.

### Activity feed
- Every mutation (board created/updated/deleted, column created/renamed/deleted, card added/updated/moved/transferred/removed) is logged as an `Activity` row.
- Activity rows snapshot the entity title at the time of the event, so deletions and renames don't leave gaps in the feed.
- View per-workspace (`/workspaces/:id/activity`) or per-board (Activity panel from the board header).
- New activities stream live to subscribers via Soketi/Pusher — no refresh required.

### Realtime
- Each board update fires `board.updated` on `private-board-{id}`.
- Each new activity fires `activity.created` on `private-workspace-{id}` and the originating board's channel.
- Channel auth is enforced server-side via `WorkspacesService.assertCanView` / `BoardsService.assertCanView`.

### Auth
- JWT in HTTP-only cookies. Cookie-based auth means the React SPA gets it automatically.
- Email + password (bcrypt). Optional Google OAuth — leave the env vars unset and the strategy logs a warning, OAuth buttons return 4xx, but everything else works.

---

## Running tests

The project ships with two test suites: Jest for the API, Vitest for the web.

```bash
# API tests (4 suites, 19 tests — auth, boards, reorder, app)
docker compose run --rm api pnpm --filter @kanban/api test

# Web tests (3 suites, 18 tests — Card component, board-key helpers, crypto helpers)
docker compose run --rm web pnpm --filter @kanban/web test --no-watch
```

Or run them locally if you have Node 22 + pnpm 10:

```bash
pnpm install
pnpm --filter @kanban/shared build
pnpm --filter @kanban/api exec prisma generate
pnpm --filter @kanban/api test
pnpm --filter @kanban/web test
```

---

## Project layout

```
kompflow/
├── apps/
│   ├── api/                 NestJS API
│   │   ├── src/
│   │   │   ├── auth/        JWT + Google OAuth, register/login
│   │   │   ├── workspaces/  Workspace CRUD + membership
│   │   │   ├── boards/      Board CRUD, multi-board listing
│   │   │   ├── columns/     Column CRUD per board
│   │   │   ├── cards/       Card CRUD per column
│   │   │   ├── reorder/     Atomic reorder + cross-board transfer
│   │   │   ├── activity/    Activity log + cursor-paginated feed
│   │   │   ├── pusher/      Realtime broadcaster (Soketi-compatible)
│   │   │   └── prisma/      Prisma service + autoseed migration
│   │   ├── prisma/schema.prisma
│   │   └── Dockerfile
│   └── web/                 Vite + React 19
│       ├── src/
│       │   ├── pages/       Dashboard, WorkspaceView, WorkspaceActivity, BoardView, Login, Register, Home
│       │   ├── components/
│       │   │   ├── layout/  AppShell, Sidebar, WorkspaceSwitcher, WorkspaceCreateModal
│       │   │   ├── activity/ActivityFeed, ActivityItem, RelativeTime
│       │   │   ├── Kanban/  Card, Column, AddCard, AddColumn, CardModal, PassphraseGate
│       │   │   └── ...      BoardCard, BoardCreateModal, SettingsPanel, SocialButtons
│       │   ├── hooks/       useWorkspaces, useAllBoards, useActivityFeed
│       │   ├── lib/         api (axios), pusher, settings, crypto, board-key
│       │   └── styles/      app.css (token system) + shell.css (sidebar/feed/page)
│       ├── nginx.conf
│       └── Dockerfile
├── packages/
│   └── shared/              Shared TS types: User, Workspace, Board, Activity, DTOs
├── docker-compose.yml
└── README.md
```

---

## Tech stack and why

| Layer                  | Choice                                | Why                                                                                                |
| ---------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **API framework**      | NestJS 11                             | Module system, dependency injection, validation pipes — gives every service the same shape.        |
| **DB**                 | Postgres 16 + Prisma 6                | Type-safe queries; Prisma generates the TS client from `schema.prisma`.                            |
| **Schema migration**   | `prisma db push`                      | Idempotent on every boot. Right call for a demo; production would use `prisma migrate`.            |
| **Auth**               | Passport + JWT cookies                | Standard NestJS pattern; no SPA token-juggling required.                                           |
| **Realtime**           | Pusher protocol via Soketi            | Battle-tested client (`pusher-js`), self-hosted server (`soketi`) — no external account needed.    |
| **Frontend framework** | React 19 + Vite 8                     | Fastest dev/build cycle.                                                                           |
| **Routing**            | React Router 7                        | Nested routes for the AppShell; everything authenticated lives under one `<Route element>`.        |
| **State**              | TanStack Query 5                      | Cache + invalidation for boards/workspaces/activity; `useInfiniteQuery` powers the activity feed.  |
| **Drag-and-drop**      | @dnd-kit                              | Accessible (keyboard reorder), no global state, handles columns and cards uniformly.               |
| **Styling**            | Tailwind v4 + custom CSS token system | Tailwind for utilities; `styles/app.css` and `styles/shell.css` for component classes and tokens.  |
| **Tests**              | Jest (API) + Vitest (web)             | Idiomatic per platform.                                                                            |
| **Monorepo**           | pnpm workspaces + Turborepo           | Shared TS package + per-app builds.                                                                |
| **Container**          | Docker Compose                        | One-command boot. Postgres, Soketi, API, web all wired with healthchecks and env defaults.         |

---

## Troubleshooting

**Port already in use** — Something on your host is bound to one of `3001`, `5173`, or `6001`. Stop it, or remap the host side in `docker-compose.yml`:

```yaml
ports:
  - "3002:3001"   # access API at host :3002 instead of :3001
```

(If you change the API host port, also bump `VITE_API_URL` in `docker-compose.yml`'s `web.build.args` and rebuild.)

**API restarts on boot** — `docker compose logs api` shows the error. Most common cause is mid-flight env edits. Start fresh: `docker compose down -v && docker compose up --build`.

**No live activity updates** — The Soketi WebSocket needs to reach `localhost:6001` from the browser. If you're running behind a corporate proxy that strips WS, the activity feed still updates on page refresh — events are still written to the DB.

**Slow first build** — Expected. `pnpm install --frozen-lockfile` downloads ~800 packages on first run. Layer cache makes subsequent builds fast.

---

## API quick reference

All routes are prefixed `/api` and (except `/auth/*` register/login) require the JWT cookie set by login/register.

| Method | Path                              | Description                                                       |
| ------ | --------------------------------- | ----------------------------------------------------------------- |
| POST   | `/auth/register`                  | Sign up; auto-creates a personal workspace                        |
| POST   | `/auth/login`                     | Email/password login                                              |
| POST   | `/auth/logout`                    | Clear cookie                                                      |
| GET    | `/auth/me`                        | Current user                                                      |
| GET    | `/workspaces`                     | List workspaces the user can access                               |
| POST   | `/workspaces`                     | Create a workspace                                                |
| GET    | `/workspaces/:id`                 | Workspace + boards + members                                      |
| PATCH  | `/workspaces/:id`                 | Rename/update visibility                                          |
| DELETE | `/workspaces/:id`                 | Owner-only                                                        |
| GET    | `/workspaces/:id/activity`        | Cursor-paginated workspace activity feed                          |
| GET    | `/boards`                         | Owned + shared boards                                             |
| GET    | `/boards?all=true`                | Every accessible board grouped by workspace                       |
| POST   | `/boards`                         | Create board in a workspace (body must include `workspaceId`)     |
| GET    | `/boards/:id`                     | Board with columns and cards                                      |
| PATCH  | `/boards/:id`                     | Edit                                                              |
| DELETE | `/boards/:id`                     | Owner-only                                                        |
| GET    | `/boards/:id/activity`            | Cursor-paginated board-scoped activity                            |
| POST   | `/boards/:boardId/columns`        | Create column                                                     |
| PATCH  | `/columns/:id`                    | Rename                                                            |
| DELETE | `/columns/:id`                    | Delete                                                            |
| POST   | `/columns/:columnId/cards`        | Add card                                                          |
| PATCH  | `/cards/:id`                      | Edit                                                              |
| DELETE | `/cards/:id`                      | Delete                                                            |
| POST   | `/boards/:boardId/reorder`        | Atomic reorder; supports cross-board transfer via `targetBoardId` |
| POST   | `/pusher/auth`                    | Channel authorization for `private-board-*` and `private-workspace-*` |

---

## Verified manually before shipping

```bash
# Register a user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","name":"Demo","password":"password123"}' \
  -c /tmp/k.cookies
# → 201, returns { user }

# Personal workspace was auto-provisioned
curl http://localhost:3001/api/workspaces -b /tmp/k.cookies
# → [{ name: "Demo's Workspace", _count: { boards: 0 } }]

# Create a board, fetch the workspace activity feed
curl -X POST http://localhost:3001/api/boards \
  -H "Content-Type: application/json" -b /tmp/k.cookies \
  -d '{"workspaceId":"<id>","title":"Roadmap"}'
curl 'http://localhost:3001/api/workspaces/<id>/activity' -b /tmp/k.cookies
# → activity row { verb: "created", entityType: "board" } with full actor + workspace context
```

This entire flow runs inside `docker compose up` with zero local setup.
