import { Injectable, NotFoundException } from '@nestjs/common';
import { BoardsService } from '../boards/boards.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Injectable()
export class CardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boards: BoardsService,
  ) {}

  async create(userId: string, columnId: string, dto: CreateCardDto) {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
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

    return { card, boardId: column.boardId };
  }

  async update(userId: string, cardId: string, dto: UpdateCardDto) {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: { column: { select: { boardId: true } } },
    });
    if (!card) throw new NotFoundException('Card not found');
    await this.boards.assertCanEdit(userId, card.column.boardId);

    const updated = await this.prisma.card.update({
      where: { id: cardId },
      data: dto,
    });
    return { card: updated, boardId: card.column.boardId };
  }

  async destroy(userId: string, cardId: string): Promise<string> {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: { column: { select: { boardId: true } } },
    });
    if (!card) throw new NotFoundException('Card not found');
    await this.boards.assertCanEdit(userId, card.column.boardId);
    await this.prisma.card.delete({ where: { id: cardId } });
    return card.column.boardId;
  }
}
