import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { BoardsService } from './boards.service';

type PrismaMock = {
  board: {
    count: jest.Mock;
    findUnique: jest.Mock;
    delete: jest.Mock;
    aggregate: jest.Mock;
  };
};

const makePrismaMock = (): PrismaMock => ({
  board: {
    count: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
  },
});

describe('BoardsService', () => {
  let service: BoardsService;
  let prisma: PrismaMock;
  let activity: { log: jest.Mock };
  let workspaces: { assertCanView: jest.Mock };

  beforeEach(async () => {
    prisma = makePrismaMock();
    activity = { log: jest.fn().mockResolvedValue(undefined) };
    workspaces = { assertCanView: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BoardsService,
        { provide: PrismaService, useValue: prisma },
        { provide: WorkspacesService, useValue: workspaces },
        { provide: ActivityService, useValue: activity },
      ],
    }).compile();

    service = moduleRef.get(BoardsService);
  });

  describe('assertCanView', () => {
    it('throws ForbiddenException when user is neither owner nor member', async () => {
      prisma.board.count.mockResolvedValue(0);

      await expect(
        service.assertCanView('outsider', 'board-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('passes silently when user is owner or member', async () => {
      prisma.board.count.mockResolvedValue(1);

      await expect(
        service.assertCanView('owner', 'board-1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('assertCanEdit', () => {
    it('rejects viewer-role members (only owner + editor allowed)', async () => {
      prisma.board.count.mockResolvedValue(0);

      await expect(
        service.assertCanEdit('viewer-user', 'board-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);

      const callArg = prisma.board.count.mock.calls[0][0] as {
        where: { OR: Array<Record<string, unknown>> };
      };
      const memberClause = callArg.where.OR.find((c) => 'members' in c) as
        | { members: { some: { role: { in: string[] } } } }
        | undefined;
      expect(memberClause).toBeDefined();
      expect(memberClause?.members.some.role.in).toEqual(['owner', 'editor']);
    });

    it('passes when user is editor', async () => {
      prisma.board.count.mockResolvedValue(1);

      await expect(
        service.assertCanEdit('editor-user', 'board-1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('destroy', () => {
    it('throws NotFoundException if the board is missing', async () => {
      prisma.board.findUnique.mockResolvedValue(null);

      await expect(
        service.destroy('user-1', 'missing-board'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.board.delete).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException for non-owner editors (delete is owner-only)', async () => {
      prisma.board.findUnique.mockResolvedValue({
        id: 'board-1',
        ownerId: 'owner-user',
        workspaceId: 'ws-1',
        title: 'Board',
      });

      await expect(
        service.destroy('editor-user', 'board-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.board.delete).not.toHaveBeenCalled();
    });

    it('deletes when caller is the owner and logs an activity', async () => {
      prisma.board.findUnique.mockResolvedValue({
        id: 'board-1',
        ownerId: 'owner-user',
        workspaceId: 'ws-1',
        title: 'Board',
      });
      prisma.board.delete.mockResolvedValue({ id: 'board-1' });

      await service.destroy('owner-user', 'board-1');
      expect(prisma.board.delete).toHaveBeenCalledWith({
        where: { id: 'board-1' },
      });
      expect(activity.log).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'ws-1',
          actorId: 'owner-user',
          verb: 'deleted',
          entityType: 'board',
          entityId: 'board-1',
          entityTitle: 'Board',
        }),
      );
    });
  });
});
