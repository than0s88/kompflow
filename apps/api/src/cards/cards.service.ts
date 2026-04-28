import { Injectable, NotFoundException } from '@nestjs/common';
import { ActivityService } from '../activity/activity.service';
import { BoardsService } from '../boards/boards.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

interface NormalizedOrnaments {
  cover: string | null;
  labels: string[];
  dueDate: string | null;
  memberIds: string[];
}

function parseOrnaments(value: unknown): NormalizedOrnaments {
  if (!value || typeof value !== 'object') {
    return { cover: null, labels: [], dueDate: null, memberIds: [] };
  }
  const o = value as Record<string, unknown>;
  return {
    cover: typeof o.cover === 'string' ? o.cover : null,
    labels: Array.isArray(o.labels)
      ? o.labels.filter((x): x is string => typeof x === 'string')
      : [],
    dueDate: typeof o.dueDate === 'string' ? o.dueDate : null,
    memberIds: Array.isArray(o.memberIds)
      ? o.memberIds.filter((x): x is string => typeof x === 'string')
      : [],
  };
}

@Injectable()
export class CardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boards: BoardsService,
    private readonly activity: ActivityService,
  ) {}

  async create(userId: string, columnId: string, dto: CreateCardDto) {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      include: { board: { select: { workspaceId: true, title: true } } },
    });
    if (!column) throw new NotFoundException('Column not found');
    await this.boards.assertCanEdit(userId, column.boardId);

    const max = await this.prisma.card.aggregate({
      where: { columnId },
      _max: { position: true },
    });

    const card = await this.prisma.card.create({
      data: {
        columnId,
        title: dto.title,
        description: dto.description,
        position: (max._max.position ?? 0) + 1024,
      },
    });

    await this.activity.log({
      workspaceId: column.board.workspaceId,
      boardId: column.boardId,
      actorId: userId,
      verb: 'added',
      entityType: 'card',
      entityId: card.id,
      entityTitle: card.title,
      metadata: { columnTitle: column.title },
    });

    return { card, boardId: column.boardId };
  }

  async update(userId: string, cardId: string, dto: UpdateCardDto) {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: {
        column: {
          select: {
            boardId: true,
            board: { select: { workspaceId: true } },
          },
        },
      },
    });
    if (!card) throw new NotFoundException('Card not found');
    await this.boards.assertCanEdit(userId, card.column.boardId);

    const updated = await this.prisma.card.update({
      where: { id: cardId },
      data: dto as never,
    });

    const workspaceId = card.column.board.workspaceId;
    const boardId = card.column.boardId;
    const hasOrnaments = dto.ornaments !== undefined;
    const hasNonOrnamentChange =
      dto.title !== undefined || dto.description !== undefined;

    // Fire a generic `updated` only for title/description changes.
    // Ornament changes get specific per-field activities below.
    if (hasNonOrnamentChange) {
      await this.activity.log({
        workspaceId,
        boardId,
        actorId: userId,
        verb: 'updated',
        entityType: 'card',
        entityId: card.id,
        entityTitle: updated.title,
      });
    }

    if (hasOrnaments) {
      await this.logOrnamentDeltas({
        workspaceId,
        boardId,
        actorId: userId,
        cardId: card.id,
        cardTitle: updated.title,
        previous: parseOrnaments(card.ornaments),
        next: parseOrnaments(dto.ornaments),
      });
    } else if (!hasNonOrnamentChange) {
      // No specific change detected — preserve prior behavior of emitting
      // one generic `updated` so an empty PATCH still leaves an audit trail.
      await this.activity.log({
        workspaceId,
        boardId,
        actorId: userId,
        verb: 'updated',
        entityType: 'card',
        entityId: card.id,
        entityTitle: updated.title,
      });
    }

    return { card: updated, boardId };
  }

  private async logOrnamentDeltas(input: {
    workspaceId: string;
    boardId: string;
    actorId: string;
    cardId: string;
    cardTitle: string;
    previous: NormalizedOrnaments;
    next: NormalizedOrnaments;
  }): Promise<void> {
    const { workspaceId, boardId, actorId, cardId, cardTitle, previous, next } =
      input;

    const base = {
      workspaceId,
      boardId,
      actorId,
      entityType: 'card' as const,
      entityId: cardId,
      entityTitle: cardTitle,
    };

    // dueDate
    if (previous.dueDate !== next.dueDate) {
      if (next.dueDate === null) {
        await this.activity.log({
          ...base,
          verb: 'updated',
          metadata: { field: 'dueDate', cleared: true },
        });
      } else {
        await this.activity.log({
          ...base,
          verb: 'updated',
          metadata: { field: 'dueDate', dueDate: next.dueDate },
        });
      }
    }

    // cover
    if (previous.cover !== next.cover) {
      if (next.cover === null) {
        await this.activity.log({
          ...base,
          verb: 'updated',
          metadata: { field: 'cover', cleared: true },
        });
      } else {
        await this.activity.log({
          ...base,
          verb: 'updated',
          metadata: { field: 'cover', cover: next.cover },
        });
      }
    }

    // labels (per-color add/remove)
    const prevLabels = new Set(previous.labels);
    const nextLabels = new Set(next.labels);
    for (const color of nextLabels) {
      if (!prevLabels.has(color)) {
        await this.activity.log({
          ...base,
          verb: 'added',
          metadata: { field: 'label', color },
        });
      }
    }
    for (const color of prevLabels) {
      if (!nextLabels.has(color)) {
        await this.activity.log({
          ...base,
          verb: 'removed',
          metadata: { field: 'label', color },
        });
      }
    }

    // members (per-id add/remove)
    const prevMembers = new Set(previous.memberIds);
    const nextMembers = new Set(next.memberIds);
    for (const memberId of nextMembers) {
      if (!prevMembers.has(memberId)) {
        await this.activity.log({
          ...base,
          verb: 'added',
          metadata: { field: 'member', memberId },
        });
      }
    }
    for (const memberId of prevMembers) {
      if (!nextMembers.has(memberId)) {
        await this.activity.log({
          ...base,
          verb: 'removed',
          metadata: { field: 'member', memberId },
        });
      }
    }
  }

  async destroy(userId: string, cardId: string): Promise<string> {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: {
        column: {
          select: {
            boardId: true,
            board: { select: { workspaceId: true } },
          },
        },
      },
    });
    if (!card) throw new NotFoundException('Card not found');
    await this.boards.assertCanEdit(userId, card.column.boardId);

    await this.activity.log({
      workspaceId: card.column.board.workspaceId,
      boardId: card.column.boardId,
      actorId: userId,
      verb: 'removed',
      entityType: 'card',
      entityId: card.id,
      entityTitle: card.title,
    });

    await this.prisma.card.delete({ where: { id: cardId } });
    return card.column.boardId;
  }
}
