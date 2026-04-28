import { Logger } from '@nestjs/common';
import type { PrismaService } from './prisma.service';

const logger = new Logger('Autoseed');

/**
 * Idempotent migration that runs on every API boot.
 *
 * For every user without a workspace, create "<Name>'s Workspace" and
 * reassign their boards into it. This keeps the demo working after the
 * Workspace model lands without forcing users to manually re-provision.
 *
 * Safe to run repeatedly — only acts on users with zero workspaces.
 */
export async function autoseedWorkspaces(prisma: PrismaService): Promise<void> {
  const users = await prisma.user.findMany({
    where: { ownedWorkspaces: { none: {} } },
    select: { id: true, name: true },
  });

  if (users.length === 0) return;

  logger.log(
    `backfilling personal workspace for ${users.length} user(s) without one`,
  );

  for (const user of users) {
    const slug = await uniqueSlug(prisma, slugify(user.name) || 'workspace');
    const workspace = await prisma.workspace.create({
      data: {
        name: `${user.name}'s Workspace`,
        slug,
        ownerId: user.id,
        members: { create: { userId: user.id, role: 'admin' } },
      },
    });

    // Reassign any orphan boards (boards that existed before workspaceId was added)
    await prisma.board.updateMany({
      where: { ownerId: user.id, workspaceId: '' },
      data: { workspaceId: workspace.id },
    });
  }

  logger.log(`autoseed complete`);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

async function uniqueSlug(
  prisma: PrismaService,
  base: string,
): Promise<string> {
  let slug = base;
  let n = 1;
  while (await prisma.workspace.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}
