import { BadRequestException, Injectable } from '@nestjs/common';
import { BoardsService } from '../boards/boards.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReorderDto } from './dto/reorder.dto';

@Injectable()
export class ReorderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boards: BoardsService,
  ) {}

  async apply(userId: string, boardId: string, dto: ReorderDto) {
    await this.boards.assertCanEdit(userId, boardId);

    const boardColumnIds = (
      await this.prisma.column.findMany({
        where: { boardId },
        select: { id: true },
      })
    ).map((c) => c.id);

    // Validate every column update belongs to this board
    for (const col of dto.columns ?? []) {
      if (!boardColumnIds.includes(col.id)) {
        throw new BadRequestException(
          `Column ${col.id} does not belong to this board`,
        );
      }
    }

    // Validate every card update is moving within columns of this board
    if (dto.cards?.length) {
      const cardIds = dto.cards.map((c) => c.id);
      const cards = await this.prisma.card.findMany({
        where: { id: { in: cardIds } },
        select: { id: true, column: { select: { boardId: true } } },
      });

      for (const c of cards) {
        if (c.column.boardId !== boardId) {
          throw new BadRequestException(
            `Card ${c.id} does not belong to this board`,
          );
        }
      }

      for (const u of dto.cards) {
        if (!boardColumnIds.includes(u.columnId)) {
          throw new BadRequestException(
            `Target column ${u.columnId} does not belong to this board`,
          );
        }
      }
    }

    await this.prisma.$transaction([
      ...(dto.columns ?? []).map((c) =>
        this.prisma.column.update({
          where: { id: c.id },
          data: { position: c.position },
        }),
      ),
      ...(dto.cards ?? []).map((c) =>
        this.prisma.card.update({
          where: { id: c.id },
          data: { position: c.position, columnId: c.columnId },
        }),
      ),
    ]);
  }
}
