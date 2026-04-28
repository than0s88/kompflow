import { BadRequestException, Injectable } from '@nestjs/common';
import { ActivityService } from '../activity/activity.service';
import { BoardsService } from '../boards/boards.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReorderDto } from './dto/reorder.dto';

@Injectable()
export class ReorderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boards: BoardsService,
    private readonly activity: ActivityService,
  ) {}

  /**
   * Apply column reorders + card moves. Card moves can cross board boundaries
   * if `targetBoardId` is provided on the card item — in that case the user
   * must have edit access on both source and destination boards.
   */
  async apply(userId: string, boardId: string, dto: ReorderDto) {
    await this.boards.assertCanEdit(userId, boardId);

    // Source board's columns — used to validate column reorders + intra-board moves
    const sourceColumns = await this.prisma.column.findMany({
      where: { boardId },
      select: { id: true, title: true },
    });
    const sourceColumnIds = new Set(sourceColumns.map((c) => c.id));

    // Validate column reorders belong to source board
    for (const col of dto.columns ?? []) {
      if (!sourceColumnIds.has(col.id)) {
        throw new BadRequestException(
          `Column ${col.id} does not belong to this board`,
        );
      }
    }

    // Group cards by destination board to compute permission + activity scope
    const cardItems = dto.cards ?? [];
    const cardIds = cardItems.map((c) => c.id);

    const dbCards = await this.prisma.card.findMany({
      where: { id: { in: cardIds } },
      include: {
        column: {
          select: {
            id: true,
            title: true,
            boardId: true,
            board: {
              select: { id: true, title: true, workspaceId: true },
            },
          },
        },
      },
    });

    const cardsById = new Map(dbCards.map((c) => [c.id, c]));

    // Pre-load any destination columns we don't already know about
    const targetColumnIds = new Set<string>();
    for (const u of cardItems) {
      targetColumnIds.add(u.columnId);
    }
    const targetColumns = await this.prisma.column.findMany({
      where: { id: { in: [...targetColumnIds] } },
      include: {
        board: { select: { id: true, title: true, workspaceId: true } },
      },
    });
    const targetColumnsById = new Map(targetColumns.map((c) => [c.id, c]));

    // Validate every move + check permissions on destination boards
    const destBoardIdsToCheck = new Set<string>();
    for (const u of cardItems) {
      const card = cardsById.get(u.id);
      if (!card) {
        throw new BadRequestException(`Card ${u.id} not found`);
      }
      const target = targetColumnsById.get(u.columnId);
      if (!target) {
        throw new BadRequestException(`Target column ${u.columnId} not found`);
      }
      // Source column must belong to the request's boardId
      if (card.column.boardId !== boardId) {
        throw new BadRequestException(
          `Card ${u.id} does not belong to this board`,
        );
      }
      // Destination column must be in source board OR in the explicit targetBoardId
      if (target.boardId !== boardId) {
        if (!u.targetBoardId || u.targetBoardId !== target.boardId) {
          throw new BadRequestException(
            `Target column ${u.columnId} does not belong to this board (set targetBoardId for cross-board transfers)`,
          );
        }
        destBoardIdsToCheck.add(target.boardId);
      }
    }

    for (const destBoardId of destBoardIdsToCheck) {
      await this.boards.assertCanEdit(userId, destBoardId);
    }

    // Execute the writes in a transaction
    await this.prisma.$transaction([
      ...(dto.columns ?? []).map((c) =>
        this.prisma.column.update({
          where: { id: c.id },
          data: { position: c.position },
        }),
      ),
      ...cardItems.map((c) =>
        this.prisma.card.update({
          where: { id: c.id },
          data: { position: c.position, columnId: c.columnId },
        }),
      ),
    ]);

    // Log activities AFTER the writes succeed.
    for (const u of cardItems) {
      const card = cardsById.get(u.id)!;
      const target = targetColumnsById.get(u.columnId)!;
      const isCrossBoard = card.column.boardId !== target.boardId;
      const movedColumn = card.column.id !== target.id;
      if (!movedColumn && !isCrossBoard) continue; // pure reorder, no activity

      if (isCrossBoard) {
        await this.activity.log({
          workspaceId: target.board.workspaceId,
          boardId: target.board.id,
          actorId: userId,
          verb: 'transferred',
          entityType: 'card',
          entityId: card.id,
          entityTitle: card.title,
          metadata: {
            fromBoardTitle: card.column.board.title,
            fromBoardId: card.column.board.id,
            toBoardTitle: target.board.title,
            toBoardId: target.board.id,
            fromColumnTitle: card.column.title,
            toColumnTitle: target.title,
          },
        });
      } else {
        await this.activity.log({
          workspaceId: target.board.workspaceId,
          boardId: target.board.id,
          actorId: userId,
          verb: 'moved',
          entityType: 'card',
          entityId: card.id,
          entityTitle: card.title,
          metadata: {
            fromColumnTitle: card.column.title,
            toColumnTitle: target.title,
          },
        });
      }
    }
  }
}
