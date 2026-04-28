import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { AuthService } from './auth.service';

type PrismaMock = {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
};

const makePrismaMock = (): PrismaMock => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
});

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaMock;
  let jwt: { sign: jest.Mock };
  let workspaces: { ensurePersonalWorkspace: jest.Mock };

  beforeEach(async () => {
    prisma = makePrismaMock();
    jwt = { sign: jest.fn().mockReturnValue('signed.jwt.token') };
    workspaces = {
      ensurePersonalWorkspace: jest
        .fn()
        .mockResolvedValue({ id: 'ws-1', name: "Alice's Workspace" }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: WorkspacesService, useValue: workspaces },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('throws ConflictException for duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.com' });

      await expect(
        service.register({
          name: 'Alice',
          email: 'a@b.com',
          password: 'secretsecret',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('hashes the password with bcrypt before persisting', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'u1',
          name: data.name,
          email: data.email,
          avatarUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const plaintext = 'secretsecret';
      await service.register({
        name: 'Alice',
        email: 'a@b.com',
        password: plaintext,
      });

      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      const callArg = prisma.user.create.mock.calls[0][0] as {
        data: { passwordHash: string };
      };
      const storedHash = callArg.data.passwordHash;

      expect(typeof storedHash).toBe('string');
      expect(storedHash).not.toEqual(plaintext);
      expect(storedHash.length).toBeGreaterThan(20);
      // The hash should verify against the original plaintext
      const ok = await bcrypt.compare(plaintext, storedHash);
      expect(ok).toBe(true);

      // And a personal workspace was provisioned for the new user
      expect(workspaces.ensurePersonalWorkspace).toHaveBeenCalledWith(
        'u1',
        'Alice',
      );
    });
  });

  describe('login', () => {
    it('rejects unknown email with UnauthorizedException', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'missing@example.com', password: 'whatever' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects social-only accounts (passwordHash null) with a clear message', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'social@example.com',
        passwordHash: null,
        googleId: 'g-1',
      });

      // Critical security check: a social-only user must NEVER be able to log in
      // with an empty / arbitrary password, even though bcrypt.compare would
      // resolve falsy on a null hash. We assert the explicit social-sign-in
      // branch is taken so the message is clear.
      const promise = service.login({
        email: 'social@example.com',
        password: '',
      });

      await expect(promise).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(promise).rejects.toMatchObject({
        message: expect.stringMatching(/social sign-in/i) as unknown,
      });
    });

    it('rejects bad password for password-account with UnauthorizedException', async () => {
      const hash = await bcrypt.hash('rightpassword', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        name: 'Alice',
        avatarUrl: null,
        passwordHash: hash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.login({ email: 'a@b.com', password: 'wrongpassword' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('findOrCreateGoogleUser', () => {
    it('links to an existing email account instead of creating a duplicate', async () => {
      // First lookup by googleId returns null (no existing google-linked account)
      // Second lookup by email returns the existing user
      prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: 'existing-user',
        email: 'a@b.com',
        name: 'Alice',
        avatarUrl: null,
      });

      prisma.user.update.mockResolvedValue({
        id: 'existing-user',
        email: 'a@b.com',
        name: 'Alice',
        avatarUrl: 'https://avatar.example/x.png',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.findOrCreateGoogleUser({
        googleId: 'g-123',
        email: 'a@b.com',
        name: 'Alice',
        avatarUrl: 'https://avatar.example/x.png',
      });

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledTimes(1);
      const updateArg = prisma.user.update.mock.calls[0][0] as {
        where: { id: string };
        data: { googleId: string };
      };
      expect(updateArg.where.id).toBe('existing-user');
      expect(updateArg.data.googleId).toBe('g-123');
      expect(result.id).toBe('existing-user');
    });
  });
});
