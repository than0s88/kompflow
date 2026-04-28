import { Injectable, NotFoundException } from '@nestjs/common';
import { ActivityService } from '../activity/activity.service';
import { BoardsService } from '../boards/boards.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

@Injectable()
export class ColumnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boards: BoardsService,
    private readonly activity: ActivityService,
  ) {}

  async create(userId: string, boardId: string, dto: CreateColumnDto) {
    await this.boards.assertCanEdit(userId, boardId);
    const max = await this.prisma.column.aggregate({
      where: { boardId },
      _max: { position: true },
    });
    const column = await this.prisma.column.create({
      data: {
        boardId,
        title: dto.title,
        position: (max._max.position ?? 0) + 1024,
      },
      include: { board: { select: { workspaceId: true } } },
    });

    await this.activity.log({
      workspaceId: column.board.workspaceId,
      boardId,
      actorId: userId,
      verb: 'created',
      entityType: 'column',
      entityId: column.id,
      entityTitle: column.title,
    });

    return { ...column, board: undefined };
  }

  async update(userId: string, columnId: string, dto: UpdateColumnDto) {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      include: { board: { select: { workspaceId: true } } },
    });
    if (!column) throw new NotFoundException('Column not found');
    await this.boards.assertCanEdit(userId, column.boardId);
    const updated = await this.prisma.column.update({
      where: { id: columnId },
      data: dto,
    });

    await this.activity.log({
      workspaceId: column.board.workspaceId,
      boardId: column.boardId,
      actorId: userId,
      verb: 'updated',
      entityType: 'column',
      entityId: column.id,
      entityTitle: updated.title,
      metadata:
        dto.title && dto.title !== column.title
          ? { previousTitle: column.title }
          : undefined,
    });

    return updated;
  }

  async destroy(userId: string, columnId: string): Promise<string> {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      include: { board: { select: { workspaceId: true } } },
    });
    if (!column) throw new NotFoundException('Column not found');
    await this.boards.assertCanEdit(userId, column.boardId);

    await this.activity.log({
      workspaceId: column.board.workspaceId,
      boardId: column.boardId,
      actorId: userId,
      verb: 'deleted',
      entityType: 'column',
      entityId: column.id,
      entityTitle: column.title,
    });

    await this.prisma.column.delete({ where: { id: columnId } });
    return column.boardId;
  }

  async getBoardId(columnId: string): Promise<string | null> {
    const c = await this.prisma.column.findUnique({
      where: { id: columnId },
      select: { boardId: true },
    });
    return c?.boardId ?? null;
  }
}
