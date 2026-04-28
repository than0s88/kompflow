/**
 * Kompflow demo seeder.
 *
 * Idempotent — safe to run repeatedly. Re-running the seed updates the
 * existing demo data in place rather than duplicating it. Wires into the
 * existing Prisma models (User, Workspace, WorkspaceMember, Board, Column,
 * Card, Activity) so everything you log in to is already pre-populated and
 * looks like a workspace that's been used for weeks.
 *
 *   pnpm --filter @kanban/api db:seed
 *
 * Demo accounts:
 *   • testadmin@kompflow.com  / Pa$$w0rd!   (workspace owner)
 *   • testuser@kompflow.com   / Pa$$w0rd!   (invited member)
 */

import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface SeedUser {
  email: string;
  name: string;
  password: string;
}

const DEMO_PASSWORD = 'Pa$$w0rd!';

const BOSS: SeedUser = {
  email: 'testadmin@kompflow.com',
  name: 'Alex Mercer',
  password: DEMO_PASSWORD,
};

const MEMBER: SeedUser = {
  email: 'testuser@kompflow.com',
  name: 'Taylor Quinn',
  password: DEMO_PASSWORD,
};

async function upsertUser(u: SeedUser) {
  const passwordHash = await bcrypt.hash(u.password, 12);
  return prisma.user.upsert({
    where: { email: u.email },
    update: { name: u.name, passwordHash },
    create: { email: u.email, name: u.name, passwordHash },
  });
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function inDays(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

interface CardSeed {
  title: string;
  description?: string;
  cover?: string | null;
  labels?: string[];
  dueDays?: number; // negative = past, positive = future, undefined = none
  memberIds?: string[]; // 'me' | 'them' | teammate pool id
}

interface ColumnSeed {
  title: string;
  cards: CardSeed[];
}

interface BoardSeed {
  title: string;
  description?: string;
  columns: ColumnSeed[];
}

const BOARDS: BoardSeed[] = [
  {
    title: 'Q3 Product Launch',
    description: 'Cross-functional plan for shipping Kompflow v2 to GA.',
    columns: [
      {
        title: 'Backlog',
        cards: [
          {
            title: 'Localization audit (FR / DE / ES)',
            description:
              'Walk every user-facing string to confirm i18n keys exist; flag any that hard-code English.',
            labels: ['blue'],
            cover: 'rgb(97, 189, 79)',
          },
          {
            title: 'Investigate native push for mobile web',
            description:
              'Scope feasibility + battery cost; PoC with web-push API.',
            labels: ['purple', 'blue'],
          },
          {
            title: 'Pricing page A/B variants',
            labels: ['orange'],
            memberIds: ['tm-sr'],
          },
        ],
      },
      {
        title: 'To Do',
        cards: [
          {
            title: 'Marketing site — hero & feature sections',
            description:
              'Refresh the landing hero with v2 messaging. Hand off to design for Loom review by Thursday.',
            labels: ['orange', 'green'],
            cover: 'rgb(255, 159, 26)',
            dueDays: 4,
            memberIds: ['me', 'tm-dp'],
          },
          {
            title: 'Finalize pricing page copy',
            description: 'Lock the four tier names + per-seat math.',
            labels: ['orange'],
            dueDays: 7,
            memberIds: ['tm-dp'],
          },
          {
            title: 'Lifecycle email sequence (5 emails)',
            description:
              'Welcome → activation → "did you try" → at-risk → reactivation. Owner: lifecycle.',
            labels: ['green', 'pink'],
            dueDays: 10,
            memberIds: ['tm-sr'],
          },
        ],
      },
      {
        title: 'In Progress',
        cards: [
          {
            title: 'Onboarding flow v3 — empty state polish',
            description:
              'New first-board nudge + animated example board. Bumper Lottie at the top is staged on a feature branch.',
            labels: ['blue', 'sky'],
            cover: 'rgb(242, 214, 0)',
            dueDays: 2,
            memberIds: ['tm-dp', 'tm-ms'],
          },
          {
            title: 'Wire up event tracking on key flows',
            description:
              'Send `card_created`, `card_moved`, `board_created`, `workspace_invited` to PostHog.',
            labels: ['red'],
            dueDays: -1,
            memberIds: ['them'],
          },
        ],
      },
      {
        title: 'In Review',
        cards: [
          {
            title: 'Logo & brand mark — final round',
            description:
              'Print proofs back from the studio. Last round of feedback before lockup.',
            labels: ['pink', 'pink'],
            cover: 'rgb(195, 119, 224)',
            dueDays: 5,
            memberIds: ['tm-lz'],
          },
        ],
      },
      {
        title: 'Done',
        cards: [
          {
            title: 'Project kickoff with leadership',
            description: 'Kickoff deck + RACI signed off. Recording in Drive.',
            labels: ['green'],
            cover: 'rgb(97, 189, 79)',
            dueDays: -7,
            memberIds: ['me', 'tm-dp', 'tm-ms', 'tm-lz'],
          },
          {
            title: 'Creative brief signed off',
            labels: ['green', 'green'],
            dueDays: -3,
            memberIds: ['tm-lz'],
          },
        ],
      },
    ],
  },
  {
    title: 'Engineering — Sprint 24',
    description: 'Two-week iteration ending end of next week.',
    columns: [
      {
        title: 'Backlog',
        cards: [
          {
            title: 'Add workspace invitation email — Postmark',
            description:
              'Hook into existing /invitations endpoint. Use Postmark template `ws-invite`.',
            labels: ['blue'],
            memberIds: ['them'],
          },
          {
            title: 'Server-side rate limit on /auth/login',
            description:
              '5 attempts / 15 min / IP. Express middleware + redis backing store.',
            labels: ['red', 'black'],
          },
          {
            title: 'Investigate Pusher → native WebSocket migration',
            description:
              'Pusher cost is climbing — scope a minimal native impl behind a feature flag.',
            labels: ['blue', 'purple'],
          },
        ],
      },
      {
        title: 'In Progress',
        cards: [
          {
            title: 'Card cover — image upload',
            description:
              'Allow image cover (S3 / R2). Cover field already accepts arbitrary CSS, just need an upload widget.',
            labels: ['orange'],
            cover: 'rgb(0, 121, 191)',
            dueDays: 3,
            memberIds: ['me'],
          },
          {
            title: 'Real-time activity ordering bug',
            description:
              'When two users move cards within ~50ms of each other the second event lands above the first in the feed. Likely needs server-side `createdAt` tiebreak instead of insertion order.',
            labels: ['red'],
            dueDays: 1,
            memberIds: ['them'],
          },
        ],
      },
      {
        title: 'Review',
        cards: [
          {
            title: 'Workspace transfer endpoint',
            description:
              'PATCH /workspaces/:id/owner — owner-only, requires confirmation.',
            labels: ['green'],
            dueDays: 0,
            memberIds: ['me', 'them'],
          },
        ],
      },
      {
        title: 'Done',
        cards: [
          {
            title: 'Theme + accent persistence',
            description:
              'Done — landed last week. Saved to localStorage with cross-tab sync.',
            labels: ['green'],
            cover: 'rgb(81, 232, 152)',
            dueDays: -5,
            memberIds: ['me'],
          },
          {
            title: 'Always-white card surface',
            description:
              'Trello-style: cards stay white over the colored canvas in both themes.',
            labels: ['green'],
            dueDays: -2,
            memberIds: ['me'],
          },
        ],
      },
    ],
  },
  {
    title: 'Marketing — Spring Campaign',
    description: 'Awareness push tied to the v2 launch.',
    columns: [
      {
        title: 'Ideas',
        cards: [
          {
            title: 'Customer story: TideHQ — 3× faster sprint reviews',
            labels: ['pink'],
            memberIds: ['tm-sr'],
          },
          { title: 'Webinar: "Kanban for non-engineers"', labels: ['sky'] },
          {
            title: 'LinkedIn carousel — 5 board templates',
            labels: ['orange'],
          },
        ],
      },
      {
        title: 'In Production',
        cards: [
          {
            title: 'Launch post + Twitter/X thread',
            description:
              'Post lands the morning of launch. Schedule via Buffer.',
            labels: ['blue'],
            cover: 'rgb(0, 194, 224)',
            dueDays: 6,
            memberIds: ['tm-sr', 'tm-ms'],
          },
        ],
      },
      {
        title: 'Live',
        cards: [
          {
            title: 'Teaser tweet — "something is coming"',
            labels: ['green'],
            dueDays: -4,
            memberIds: ['tm-sr'],
          },
        ],
      },
    ],
  },
];

async function seed() {
  console.log('🌱  Seeding Kompflow demo data…');

  const [boss, member] = await Promise.all([
    upsertUser(BOSS),
    upsertUser(MEMBER),
  ]);
  console.log(`✓ users        boss=${boss.email}  member=${member.email}`);

  // Workspace owned by the boss; member is invited.
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'kompflow-demo' },
    update: { ownerId: boss.id },
    create: {
      name: "Alex's Workspace",
      slug: 'kompflow-demo',
      ownerId: boss.id,
    },
  });

  // Owner row is implicit via ownerId, but we still want them as a workspace
  // member so the member-only queries return them too.
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: { workspaceId: workspace.id, userId: boss.id },
    },
    update: { role: 'admin' },
    create: { workspaceId: workspace.id, userId: boss.id, role: 'admin' },
  });
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: { workspaceId: workspace.id, userId: member.id },
    },
    update: { role: 'member' },
    create: { workspaceId: workspace.id, userId: member.id, role: 'member' },
  });
  console.log(`✓ workspace    ${workspace.name} (${workspace.slug})`);

  // Wipe existing demo boards in this workspace before re-seeding so
  // re-running the script doesn't pile up duplicates.
  await prisma.board.deleteMany({ where: { workspaceId: workspace.id } });

  for (let bi = 0; bi < BOARDS.length; bi += 1) {
    const seed = BOARDS[bi];
    const board = await prisma.board.create({
      data: {
        title: seed.title,
        description: seed.description ?? null,
        ownerId: boss.id,
        workspaceId: workspace.id,
        position: (bi + 1) * 1024,
        members: {
          create: [
            { userId: boss.id, role: 'owner' },
            { userId: member.id, role: 'editor' },
          ],
        },
      },
    });

    for (let ci = 0; ci < seed.columns.length; ci += 1) {
      const colSeed = seed.columns[ci];
      const column = await prisma.column.create({
        data: {
          boardId: board.id,
          title: colSeed.title,
          position: (ci + 1) * 1024,
        },
      });

      for (let ki = 0; ki < colSeed.cards.length; ki += 1) {
        const card = colSeed.cards[ki];
        const ornaments = {
          cover: card.cover ?? null,
          labels: card.labels ?? [],
          dueDate:
            card.dueDays !== undefined
              ? inDays(card.dueDays).toISOString()
              : null,
          // Replace 'them' sentinel with the actual member id so avatars render.
          memberIds: (card.memberIds ?? []).map((id) =>
            id === 'them' ? member.id : id,
          ),
        };
        await prisma.card.create({
          data: {
            columnId: column.id,
            title: card.title,
            description: card.description ?? null,
            position: (ki + 1) * 1024,
            ornaments,
          },
        });
      }
    }
    console.log(
      `  ✓ board       ${board.title} (${seed.columns.length} columns)`,
    );
  }

  // Wipe + replay demo activity. Captures realistic-looking history across
  // the last week so the activity feed isn't empty.
  await prisma.activity.deleteMany({ where: { workspaceId: workspace.id } });
  const refreshed = await prisma.board.findMany({
    where: { workspaceId: workspace.id },
    include: { columns: { include: { cards: true } } },
  });

  const activityRows: Prisma.ActivityCreateManyInput[] = [];
  let dayOffset = 7;
  for (const board of refreshed) {
    activityRows.push({
      workspaceId: workspace.id,
      boardId: board.id,
      actorId: boss.id,
      verb: 'created',
      entityType: 'board',
      entityId: board.id,
      entityTitle: board.title,
      metadata: Prisma.JsonNull,
      createdAt: daysAgo(dayOffset),
    });
    dayOffset = Math.max(0, dayOffset - 1);

    for (const col of board.columns) {
      for (const card of col.cards.slice(0, 2)) {
        const actor = Math.random() > 0.5 ? boss.id : member.id;
        activityRows.push({
          workspaceId: workspace.id,
          boardId: board.id,
          actorId: actor,
          verb: 'created',
          entityType: 'card',
          entityId: card.id,
          entityTitle: card.title,
          metadata: Prisma.JsonNull,
          createdAt: daysAgo(dayOffset),
        });
        dayOffset = Math.max(0, dayOffset - 0.4);

        if (col.title === 'In Progress' || col.title === 'Done') {
          activityRows.push({
            workspaceId: workspace.id,
            boardId: board.id,
            actorId: actor,
            verb: 'moved',
            entityType: 'card',
            entityId: card.id,
            entityTitle: card.title,
            metadata: {
              fromColumnTitle: 'To Do',
              toColumnTitle: col.title,
            },
            createdAt: daysAgo(Math.max(0, dayOffset - 0.2)),
          });
        }
      }
    }
  }
  if (activityRows.length > 0) {
    await prisma.activity.createMany({ data: activityRows });
  }
  console.log(`✓ activity     ${activityRows.length} entries`);

  console.log('');
  console.log('────────────────────────────────────────────────────────────');
  console.log(' 🎉 Done. Demo accounts:');
  console.log(`   • Boss   — ${BOSS.email}   /   ${BOSS.password}`);
  console.log(`   • Member — ${MEMBER.email} /   ${MEMBER.password}`);
  console.log('────────────────────────────────────────────────────────────');
}

seed()
  .catch((err) => {
    console.error('❌  Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
