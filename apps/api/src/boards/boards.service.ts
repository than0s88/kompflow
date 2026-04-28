import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@Injectable()
export class BoardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspacesService,
    private readonly activity: ActivityService,
  ) {}

  async listForUser(userId: string) {
    const owned = await this.prisma.board.findMany({
      where: { ownerId: userId },
      orderBy: { position: 'asc' },
    });

    const memberships = await this.prisma.boardMember.findMany({
      where: { userId, board: { ownerId: { not: userId } } },
      include: { board: true },
    });

    const shared = memberships.map((m) => m.board);

    return { owned, shared };
  }

  /**
   * Returns every board the user can access, grouped by workspace.
   * Used by the Dashboard's "all boards" view.
   */
  async listAllAccessible(userId: string) {
    const workspaces = await this.prisma.workspace.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: {
        boards: { orderBy: { position: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return workspaces;
  }

  async create(userId: string, workspaceId: string, dto: CreateBoardDto) {
    await this.workspaces.assertCanView(userId, workspaceId);

    const max = await this.prisma.board.aggregate({
      where: { workspaceId },
      _max: { position: true },
    });

    const nextPosition = (max._max.position ?? 0) + 1024;

    const board = await this.prisma.$transaction(async (tx) => {
      return tx.board.create({
        data: {
          workspaceId,
          ownerId: userId,
          title: dto.title,
          description: dto.description,
          position: nextPosition,
          members: {
            create: { userId, role: 'owner' },
          },
          columns: {
            create: [
              { title: 'To Do', position: 1024 },
              { title: 'In Progress', position: 2048 },
              { title: 'Done', position: 3072 },
            ],
          },
        },
      });
    });

    await this.activity.log({
      workspaceId,
      boardId: board.id,
      actorId: userId,
      verb: 'created',
      entityType: 'board',
      entityId: board.id,
      entityTitle: board.title,
    });

    return board;
  }

  async show(userId: string, boardId: string) {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            cards: { orderBy: { position: 'asc' } },
          },
        },
      },
    });

    if (!board) throw new NotFoundException('Board not found');
    await this.assertCanView(userId, boardId);

    return board;
  }

  async update(userId: string, boardId: string, dto: UpdateBoardDto) {
    await this.assertCanEdit(userId, boardId);
    const updated = await this.prisma.board.update({
      where: { id: boardId },
      data: dto,
    });

    await this.activity.log({
      workspaceId: updated.workspaceId,
      boardId: updated.id,
      actorId: userId,
      verb: 'updated',
      entityType: 'board',
      entityId: updated.id,
      entityTitle: updated.title,
    });

    return updated;
  }

  async destroy(userId: string, boardId: string) {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
    });
    if (!board) throw new NotFoundException('Board not found');
    if (board.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can delete this board');
    }

    await this.activity.log({
      workspaceId: board.workspaceId,
      boardId: null,
      actorId: userId,
      verb: 'deleted',
      entityType: 'board',
      entityId: board.id,
      entityTitle: board.title,
    });

    await this.prisma.board.delete({ where: { id: boardId } });
  }

  async assertCanView(userId: string, boardId: string): Promise<void> {
    const exists = await this.prisma.board.count({
      where: {
        id: boardId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
          { workspace: { ownerId: userId } },
          { workspace: { members: { some: { userId } } } },
        ],
      },
    });
    if (!exists) throw new ForbiddenException('No access to this board');
  }

  async assertCanEdit(userId: string, boardId: string): Promise<void> {
    const allowed = await this.prisma.board.count({
      where: {
        id: boardId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId, role: { in: ['owner', 'editor'] } } } },
          { workspace: { ownerId: userId } },
        ],
      },
    });
    if (!allowed) throw new ForbiddenException('No edit access to this board');
  }
}
