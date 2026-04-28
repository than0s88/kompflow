import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ReorderService } from './reorder.service';
import { BoardsService } from '../boards/boards.service';
import { PrismaService } from '../prisma/prisma.service';

type PrismaMock = {
  column: { findMany: jest.Mock; update: jest.Mock };
  card: { findMany: jest.Mock; update: jest.Mock };
  $transaction: jest.Mock;
};

const makePrismaMock = (): PrismaMock => ({
  column: { findMany: jest.fn(), update: jest.fn() },
  card: { findMany: jest.fn(), update: jest.fn() },
  $transaction: jest.fn().mockResolvedValue([]),
});

describe('ReorderService', () => {
  let service: ReorderService;
  let prisma: PrismaMock;
  let boards: { assertCanEdit: jest.Mock };

  beforeEach(async () => {
    prisma = makePrismaMock();
    boards = { assertCanEdit: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReorderService,
        { provide: PrismaService, useValue: prisma },
        { provide: BoardsService, useValue: boards },
      ],
    }).compile();

    service = moduleRef.get(ReorderService);
  });

  it('rejects column updates that reference a column on a different board', async () => {
    // This board owns columns col-A and col-B, but the payload tries to
    // sneak col-FOREIGN (belonging to another board) into the reorder.
    prisma.column.findMany.mockResolvedValue([
      { id: 'col-A' },
      { id: 'col-B' },
    ]);

    await expect(
      service.apply('user-1', 'board-1', {
        columns: [
          { id: 'col-A', position: 1024 },
          { id: 'col-FOREIGN', position: 2048 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects card moves whose target columnId is not on this board', async () => {
    prisma.column.findMany.mockResolvedValue([
      { id: 'col-A' },
      { id: 'col-B' },
    ]);
    // Card itself lives on board-1, so the source column passes the boardId check.
    prisma.card.findMany.mockResolvedValue([
      { id: 'card-1', column: { boardId: 'board-1' } },
    ]);

    await expect(
      service.apply('user-1', 'board-1', {
        cards: [
          // Trying to move card-1 onto a column that belongs to a different board
          { id: 'card-1', position: 1024, columnId: 'col-FOREIGN' },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects card moves whose card belongs to a different board', async () => {
    prisma.column.findMany.mockResolvedValue([
      { id: 'col-A' },
      { id: 'col-B' },
    ]);
    // The card's source column is on a foreign board => isolation breach.
    prisma.card.findMany.mockResolvedValue([
      { id: 'card-1', column: { boardId: 'OTHER-board' } },
    ]);

    await expect(
      service.apply('user-1', 'board-1', {
        cards: [{ id: 'card-1', position: 1024, columnId: 'col-A' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('applies a valid reorder transaction', async () => {
    prisma.column.findMany.mockResolvedValue([
      { id: 'col-A' },
      { id: 'col-B' },
    ]);
    prisma.card.findMany.mockResolvedValue([
      { id: 'card-1', column: { boardId: 'board-1' } },
    ]);

    await service.apply('user-1', 'board-1', {
      columns: [{ id: 'col-A', position: 2048 }],
      cards: [{ id: 'card-1', position: 1024, columnId: 'col-B' }],
    });

    expect(boards.assertCanEdit).toHaveBeenCalledWith('user-1', 'board-1');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
