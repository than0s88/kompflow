import { Injectable, Logger } from '@nestjs/common';
import type {
  ActivityEntityType,
  ActivityRecord,
  ActivityVerb,
} from '@kanban/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PusherService } from '../pusher/pusher.service';

interface LogActivityInput {
  workspaceId: string;
  boardId?: string | null;
  actorId: string;
  verb: ActivityVerb;
  entityType: ActivityEntityType;
  entityId: string;
  entityTitle: string;
  metadata?: Record<string, unknown>;
}

interface ListOptions {
  limit?: number;
  // Cursor: ISO timestamp of the last item from the previous page.
  before?: string;
}

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pusher: PusherService,
  ) {}

  async log(input: LogActivityInput): Promise<ActivityRecord> {
    const row = await this.prisma.activity.create({
      data: {
        workspaceId: input.workspaceId,
        boardId: input.boardId ?? null,
        actorId: input.actorId,
        verb: input.verb,
        entityType: input.entityType,
        entityId: input.entityId,
        entityTitle: input.entityTitle,
        metadata: (input.metadata ?? null) as never,
      },
      include: {
        actor: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        board: { select: { id: true, title: true } },
        workspace: { select: { id: true, name: true } },
      },
    });

    const record = toRecord(row);

    // Fire-and-forget broadcast so a Pusher hiccup doesn't fail the request.
    void this.pusher
      .broadcastWorkspaceActivity(input.workspaceId, record)
      .catch((err) =>
        this.logger.warn(`activity broadcast failed: ${String(err)}`),
      );

    return record;
  }

  async listForWorkspace(
    workspaceId: string,
    opts: ListOptions = {},
  ): Promise<{ items: ActivityRecord[]; nextCursor: string | null }> {
    return this.list({ workspaceId }, opts);
  }

  async listForBoard(
    boardId: string,
    opts: ListOptions = {},
  ): Promise<{ items: ActivityRecord[]; nextCursor: string | null }> {
    return this.list({ boardId }, opts);
  }

  private async list(
    where: { workspaceId?: string; boardId?: string },
    opts: ListOptions,
  ): Promise<{ items: ActivityRecord[]; nextCursor: string | null }> {
    const limit = Math.min(Math.max(opts.limit ?? 25, 1), 100);
    const before = opts.before ? new Date(opts.before) : undefined;

    const rows = await this.prisma.activity.findMany({
      where: {
        ...where,
        ...(before ? { createdAt: { lt: before } } : {}),
      },
      include: {
        actor: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        board: { select: { id: true, title: true } },
        workspace: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map(toRecord);
    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1].createdAt : null;

    return { items, nextCursor };
  }
}

type ActivityRow = {
  id: string;
  workspaceId: string;
  boardId: string | null;
  actorId: string;
  verb: string;
  entityType: string;
  entityId: string;
  entityTitle: string;
  metadata: unknown;
  createdAt: Date;
  actor: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  board: { id: string; title: string } | null;
  workspace: { id: string; name: string };
};

function toRecord(row: ActivityRow): ActivityRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    boardId: row.boardId,
    actorId: row.actorId,
    verb: row.verb as ActivityVerb,
    entityType: row.entityType as ActivityEntityType,
    entityId: row.entityId,
    entityTitle: row.entityTitle,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt.toISOString(),
    actor: {
      id: row.actor.id,
      name: row.actor.name,
      email: row.actor.email,
      avatarUrl: row.actor.avatarUrl,
    },
    board: row.board,
    workspace: {
      id: row.workspace.id,
      name: row.workspace.name,
    },
  };
}
