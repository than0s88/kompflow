import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ActivityService } from '../activity/activity.service';
import { BoardsService } from '../boards/boards.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReorderService } from './reorder.service';

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
  let activity: { log: jest.Mock };

  beforeEach(async () => {
    prisma = makePrismaMock();
    boards = { assertCanEdit: jest.fn().mockResolvedValue(undefined) };
    activity = { log: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReorderService,
        { provide: PrismaService, useValue: prisma },
        { provide: BoardsService, useValue: boards },
        { provide: ActivityService, useValue: activity },
      ],
    }).compile();

    service = moduleRef.get(ReorderService);
  });

  it('rejects column updates that reference a column on a different board', async () => {
    prisma.column.findMany
      .mockResolvedValueOnce([
        { id: 'col-A', title: 'A' },
        { id: 'col-B', title: 'B' },
      ])
      // Second call: target column lookup (none — no card moves)
      .mockResolvedValueOnce([]);

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

  it('rejects intra-request card move into another board without targetBoardId', async () => {
    prisma.column.findMany
      .mockResolvedValueOnce([
        { id: 'col-A', title: 'A' },
        { id: 'col-B', title: 'B' },
      ])
      .mockResolvedValueOnce([
        {
          id: 'col-FOREIGN',
          title: 'Foreign',
          boardId: 'OTHER-board',
          board: { id: 'OTHER-board', title: 'Other', workspaceId: 'ws-2' },
        },
      ]);
    prisma.card.findMany.mockResolvedValue([
      {
        id: 'card-1',
        title: 'C1',
        column: {
          id: 'col-A',
          title: 'A',
          boardId: 'board-1',
          board: { id: 'board-1', title: 'B1', workspaceId: 'ws-1' },
        },
      },
    ]);

    await expect(
      service.apply('user-1', 'board-1', {
        cards: [{ id: 'card-1', position: 1024, columnId: 'col-FOREIGN' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects card moves whose card belongs to a different board', async () => {
    prisma.column.findMany
      .mockResolvedValueOnce([
        { id: 'col-A', title: 'A' },
        { id: 'col-B', title: 'B' },
      ])
      .mockResolvedValueOnce([
        {
          id: 'col-A',
          title: 'A',
          boardId: 'board-1',
          board: { id: 'board-1', title: 'B1', workspaceId: 'ws-1' },
        },
      ]);
    prisma.card.findMany.mockResolvedValue([
      {
        id: 'card-1',
        title: 'C1',
        column: {
          id: 'foreign-col',
          title: 'X',
          boardId: 'OTHER-board',
          board: { id: 'OTHER-board', title: 'Other', workspaceId: 'ws-2' },
        },
      },
    ]);

    await expect(
      service.apply('user-1', 'board-1', {
        cards: [{ id: 'card-1', position: 1024, columnId: 'col-A' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('applies a valid intra-board reorder + logs a moved activity', async () => {
    prisma.column.findMany
      .mockResolvedValueOnce([
        { id: 'col-A', title: 'To Do' },
        { id: 'col-B', title: 'Done' },
      ])
      .mockResolvedValueOnce([
        {
          id: 'col-B',
          title: 'Done',
          boardId: 'board-1',
          board: { id: 'board-1', title: 'B1', workspaceId: 'ws-1' },
        },
      ]);
    prisma.card.findMany.mockResolvedValue([
      {
        id: 'card-1',
        title: 'C1',
        column: {
          id: 'col-A',
          title: 'To Do',
          boardId: 'board-1',
          board: { id: 'board-1', title: 'B1', workspaceId: 'ws-1' },
        },
      },
    ]);

    await service.apply('user-1', 'board-1', {
      columns: [{ id: 'col-A', position: 2048 }],
      cards: [{ id: 'card-1', position: 1024, columnId: 'col-B' }],
    });

    expect(boards.assertCanEdit).toHaveBeenCalledWith('user-1', 'board-1');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(activity.log).toHaveBeenCalledWith(
      expect.objectContaining({
        verb: 'moved',
        entityType: 'card',
        entityId: 'card-1',
        metadata: expect.objectContaining({
          fromColumnTitle: 'To Do',
          toColumnTitle: 'Done',
        }),
      }),
    );
  });

  it('logs a transferred activity for a cross-board move with targetBoardId', async () => {
    prisma.column.findMany
      .mockResolvedValueOnce([{ id: 'col-A', title: 'To Do' }])
      .mockResolvedValueOnce([
        {
          id: 'col-X',
          title: 'Inbox',
          boardId: 'board-2',
          board: { id: 'board-2', title: 'Test board', workspaceId: 'ws-1' },
        },
      ]);
    prisma.card.findMany.mockResolvedValue([
      {
        id: 'card-1',
        title: 'C1',
        column: {
          id: 'col-A',
          title: 'To Do',
          boardId: 'board-1',
          board: { id: 'board-1', title: 'Inbox', workspaceId: 'ws-1' },
        },
      },
    ]);

    await service.apply('user-1', 'board-1', {
      cards: [
        {
          id: 'card-1',
          position: 1024,
          columnId: 'col-X',
          targetBoardId: 'board-2',
        },
      ],
    });

    expect(boards.assertCanEdit).toHaveBeenCalledWith('user-1', 'board-1');
    expect(boards.assertCanEdit).toHaveBeenCalledWith('user-1', 'board-2');
    expect(activity.log).toHaveBeenCalledWith(
      expect.objectContaining({
        verb: 'transferred',
        entityType: 'card',
        metadata: expect.objectContaining({
          fromBoardTitle: 'Inbox',
          toBoardTitle: 'Test board',
        }),
      }),
    );
  });
});
