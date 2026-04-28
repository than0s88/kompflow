import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BoardsService } from './boards.service';
import { PrismaService } from '../prisma/prisma.service';

type PrismaMock = {
  board: {
    count: jest.Mock;
    findUnique: jest.Mock;
    delete: jest.Mock;
  };
};

const makePrismaMock = (): PrismaMock => ({
  board: {
    count: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
});

describe('BoardsService', () => {
  let service: BoardsService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = makePrismaMock();

    const moduleRef = await Test.createTestingModule({
      providers: [BoardsService, { provide: PrismaService, useValue: prisma }],
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
      // Simulate: the count query restricts to role IN [owner, editor],
      // so a viewer-only member returns 0.
      prisma.board.count.mockResolvedValue(0);

      await expect(
        service.assertCanEdit('viewer-user', 'board-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);

      // Verify the query actually restricts by role
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
      });

      await expect(
        service.destroy('editor-user', 'board-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.board.delete).not.toHaveBeenCalled();
    });

    it('deletes when caller is the owner', async () => {
      prisma.board.findUnique.mockResolvedValue({
        id: 'board-1',
        ownerId: 'owner-user',
      });
      prisma.board.delete.mockResolvedValue({ id: 'board-1' });

      await service.destroy('owner-user', 'board-1');
      expect(prisma.board.delete).toHaveBeenCalledWith({
        where: { id: 'board-1' },
      });
    });
  });
});
