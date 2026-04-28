import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  /**
   * Remove a workspace member. Admins (or the workspace owner) can remove
   * anyone except the workspace owner; members can remove themselves
   * (i.e. leave the workspace). Logs a "removed" activity so other
   * workspace members see the change in real time.
   */
  async removeMember(
    actorId: string,
    workspaceId: string,
    targetUserId: string,
  ): Promise<void> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    if (workspace.ownerId === targetUserId) {
      throw new BadRequestException(
        'The workspace owner cannot be removed. Transfer ownership or delete the workspace instead.',
      );
    }

    // Self-removal is always allowed (leaving). Otherwise must be admin.
    if (targetUserId !== actorId) {
      await this.assertCanEdit(actorId, workspaceId);
    } else {
      await this.assertCanView(actorId, workspaceId);
    }

    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
    if (!member) throw new NotFoundException('Member not found');

    await this.prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    });

    await this.activity.log({
      workspaceId,
      actorId,
      verb: 'removed',
      entityType: 'member',
      entityId: targetUserId,
      entityTitle: member.user.name,
      metadata: { selfLeave: targetUserId === actorId },
    });
  }

  async listForUser(userId: string) {
    return this.prisma.workspace.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: {
        _count: { select: { boards: true, members: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(userId: string, dto: CreateWorkspaceDto) {
    const slug = await this.uniqueSlug(slugify(dto.name) || 'workspace');

    return this.prisma.workspace.create({
      data: {
        name: dto.name,
        slug,
        ownerId: userId,
        members: { create: { userId, role: 'admin' } },
      },
    });
  }

  async show(userId: string, id: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        boards: { orderBy: { position: 'asc' } },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    await this.assertCanView(userId, id);
    return workspace;
  }

  async update(userId: string, id: string, dto: UpdateWorkspaceDto) {
    await this.assertCanEdit(userId, id);
    return this.prisma.workspace.update({ where: { id }, data: dto });
  }

  async destroy(userId: string, id: string) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id } });
    if (!workspace) throw new NotFoundException('Workspace not found');
    if (workspace.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can delete this workspace');
    }
    await this.prisma.workspace.delete({ where: { id } });
  }

  async assertCanView(userId: string, workspaceId: string): Promise<void> {
    const exists = await this.prisma.workspace.count({
      where: {
        id: workspaceId,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
    });
    if (!exists) throw new ForbiddenException('No access to this workspace');
  }

  async assertCanEdit(userId: string, workspaceId: string): Promise<void> {
    const allowed = await this.prisma.workspace.count({
      where: {
        id: workspaceId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId, role: 'admin' } } },
        ],
      },
    });
    if (!allowed)
      throw new ForbiddenException('No edit access to this workspace');
  }

  /**
   * Returns the user's primary workspace, creating one if it doesn't exist.
   * Used by registration / first-login flows.
   */
  async ensurePersonalWorkspace(userId: string, displayName: string) {
    const existing = await this.prisma.workspace.findFirst({
      where: { ownerId: userId },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) return existing;

    const slug = await this.uniqueSlug(
      slugify(displayName) || 'personal-workspace',
    );

    return this.prisma.workspace.create({
      data: {
        name: `${displayName}'s Workspace`,
        slug,
        ownerId: userId,
        members: { create: { userId, role: 'admin' } },
      },
    });
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base;
    let n = 1;
    while (await this.prisma.workspace.findUnique({ where: { slug } })) {
      n += 1;
      slug = `${base}-${n}`;
    }
    return slug;
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}
