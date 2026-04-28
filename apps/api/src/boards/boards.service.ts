import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(userId: string, dto: CreateBoardDto) {
    const max = await this.prisma.board.aggregate({
      where: { ownerId: userId },
      _max: { position: true },
    });

    const board = await this.prisma.board.create({
      data: {
        ownerId: userId,
        title: dto.title,
        description: dto.description,
        position: (max._max.position ?? 0) + 1024,
        members: {
          create: { userId, role: 'owner' },
        },
      },
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
    return this.prisma.board.update({ where: { id: boardId }, data: dto });
  }

  async destroy(userId: string, boardId: string) {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
    });
    if (!board) throw new NotFoundException('Board not found');
    if (board.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can delete this board');
    }
    await this.prisma.board.delete({ where: { id: boardId } });
  }

  async assertCanView(userId: string, boardId: string): Promise<void> {
    const exists = await this.prisma.board.count({
      where: {
        id: boardId,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
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
        ],
      },
    });
    if (!allowed) throw new ForbiddenException('No edit access to this board');
  }
}
