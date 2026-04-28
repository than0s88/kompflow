import { Injectable, NotFoundException } from '@nestjs/common';
import { BoardsService } from '../boards/boards.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

@Injectable()
export class ColumnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boards: BoardsService,
  ) {}

  async create(userId: string, boardId: string, dto: CreateColumnDto) {
    await this.boards.assertCanEdit(userId, boardId);
    const max = await this.prisma.column.aggregate({
      where: { boardId },
      _max: { position: true },
    });
    return this.prisma.column.create({
      data: {
        boardId,
        title: dto.title,
        position: (max._max.position ?? 0) + 1024,
      },
    });
  }

  async update(userId: string, columnId: string, dto: UpdateColumnDto) {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
    });
    if (!column) throw new NotFoundException('Column not found');
    await this.boards.assertCanEdit(userId, column.boardId);
    return this.prisma.column.update({ where: { id: columnId }, data: dto });
  }

  async destroy(userId: string, columnId: string): Promise<string> {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
    });
    if (!column) throw new NotFoundException('Column not found');
    await this.boards.assertCanEdit(userId, column.boardId);
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
