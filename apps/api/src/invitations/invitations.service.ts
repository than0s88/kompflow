import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  InvitationPreview,
  WorkspaceInvitation as SharedWorkspaceInvitation,
} from '@kanban/shared';
import { createHash, randomBytes } from 'node:crypto';
import { ActivityService } from '../activity/activity.service';
import { MailerService } from '../mailer/mailer.service';
import { renderInvitationEmail } from '../mailer/templates/invitation';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';

const TOKEN_BYTES = 32;
const EXPIRY_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface CreateInvitationResult {
  invitation: SharedWorkspaceInvitation;
  mailDelivered: boolean;
  // Always returned so admins can copy the link if SMTP is offline.
  acceptUrl: string;
}

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspacesService,
    private readonly activity: ActivityService,
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {}

  async create(
    actorId: string,
    workspaceId: string,
    dto: CreateInvitationDto,
  ): Promise<CreateInvitationResult> {
    await this.workspaces.assertCanEdit(actorId, workspaceId);

    const email = dto.email.trim().toLowerCase();
    const role = dto.role ?? 'member';

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    const inviter = await this.prisma.user.findUnique({
      where: { id: actorId },
    });
    if (!inviter) throw new NotFoundException('Inviter not found');

    // Check if email already maps to a workspace member.
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      const alreadyMember = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId: existingUser.id },
        },
      });
      if (alreadyMember) {
        throw new ConflictException(
          'That user is already a member of this workspace',
        );
      }
    }

    // Reject duplicate pending invite for the same email.
    const existingPending = await this.prisma.workspaceInvitation.findFirst({
      where: { workspaceId, email, status: 'pending' },
    });
    if (existingPending) {
      throw new ConflictException(
        'A pending invitation for this email already exists',
      );
    }

    const rawToken = randomBytes(TOKEN_BYTES).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + EXPIRY_DAYS * MS_PER_DAY);

    const invitation = await this.prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        email,
        role,
        tokenHash,
        invitedById: actorId,
        expiresAt,
      },
      include: {
        invitedBy: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    const webOrigin =
      this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:5173';
    const acceptUrl = `${webOrigin.replace(/\/$/, '')}/invite/${rawToken}`;

    const rendered = renderInvitationEmail({
      inviterName: inviter.name,
      workspaceName: workspace.name,
      email,
      acceptUrl,
      isExistingUser: !!existingUser,
    });

    const mailResult = await this.mailer.send({
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    if (!mailResult.ok) {
      this.logger.warn(
        `invite created but email not delivered: ${mailResult.error ?? 'unknown'}`,
      );
    }

    // Activity: log the invitation so every workspace member sees it
    // appear in the feed (and as a real-time toast) immediately.
    await this.activity.log({
      workspaceId,
      actorId,
      verb: 'invited',
      entityType: 'invitation',
      entityId: invitation.id,
      entityTitle: email,
      metadata: { role, mailDelivered: mailResult.ok },
    });

    return {
      invitation: toShared(invitation),
      mailDelivered: mailResult.ok,
      acceptUrl,
    };
  }

  async listForWorkspace(
    actorId: string,
    workspaceId: string,
  ): Promise<SharedWorkspaceInvitation[]> {
    await this.workspaces.assertCanEdit(actorId, workspaceId);
    const rows = await this.prisma.workspaceInvitation.findMany({
      where: { workspaceId, status: 'pending' },
      include: {
        invitedBy: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toShared);
  }

  async revoke(actorId: string, invitationId: string): Promise<void> {
    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    await this.workspaces.assertCanEdit(actorId, invitation.workspaceId);

    if (invitation.status !== 'pending') {
      throw new BadRequestException('Only pending invitations can be revoked');
    }

    await this.prisma.workspaceInvitation.update({
      where: { id: invitationId },
      data: { status: 'revoked' },
    });

    await this.activity.log({
      workspaceId: invitation.workspaceId,
      actorId,
      verb: 'removed',
      entityType: 'invitation',
      entityId: invitation.id,
      entityTitle: invitation.email,
      metadata: { reason: 'revoked' },
    });
  }

  async preview(token: string): Promise<InvitationPreview> {
    const invitation = await this.findByRawToken(token);
    if (!invitation) throw new NotFoundException('Invitation not found');

    const status = computeEffectiveStatus(invitation);
    return {
      workspaceName: invitation.workspace.name,
      inviterName: invitation.invitedBy.name,
      email: invitation.email,
      role: invitation.role as 'admin' | 'member',
      expiresAt: invitation.expiresAt.toISOString(),
      status,
    };
  }

  async accept(
    actorId: string,
    actorEmail: string,
    token: string,
  ): Promise<{ workspaceId: string }> {
    const invitation = await this.findByRawToken(token);
    if (!invitation) throw new NotFoundException('Invitation not found');

    const status = computeEffectiveStatus(invitation);
    if (status === 'expired') {
      // Persist the new status so admins see it.
      await this.prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' },
      });
      throw new BadRequestException('This invitation has expired');
    }
    if (status === 'revoked') {
      throw new BadRequestException('This invitation was revoked');
    }
    if (status === 'accepted') {
      // Idempotent — user clicked twice; just return the workspace.
      return { workspaceId: invitation.workspaceId };
    }

    if (invitation.email.toLowerCase() !== actorEmail.toLowerCase()) {
      throw new ForbiddenException(
        'This invitation was sent to a different email. Sign in with the matching account to accept.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: invitation.workspaceId,
            userId: actorId,
          },
        },
        update: {},
        create: {
          workspaceId: invitation.workspaceId,
          userId: actorId,
          role: invitation.role,
        },
      });
      await tx.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: 'accepted', acceptedAt: new Date() },
      });
    });

    // Lookup the actor's display name for the activity entry.
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { name: true },
    });

    await this.activity.log({
      workspaceId: invitation.workspaceId,
      actorId,
      verb: 'joined',
      entityType: 'member',
      entityId: actorId,
      entityTitle: actor?.name ?? actorEmail,
      metadata: { invitationId: invitation.id, role: invitation.role },
    });

    return { workspaceId: invitation.workspaceId };
  }

  private async findByRawToken(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    return this.prisma.workspaceInvitation.findUnique({
      where: { tokenHash },
      include: {
        workspace: { select: { id: true, name: true } },
        invitedBy: { select: { name: true } },
      },
    });
  }
}

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

interface InvitationRow {
  id: string;
  workspaceId: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
  invitedBy?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

function toShared(row: InvitationRow): SharedWorkspaceInvitation {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    email: row.email,
    role: row.role as 'admin' | 'member',
    status: row.status as SharedWorkspaceInvitation['status'],
    expiresAt: row.expiresAt.toISOString(),
    acceptedAt: row.acceptedAt ? row.acceptedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    invitedBy: row.invitedBy
      ? {
          id: row.invitedBy.id,
          name: row.invitedBy.name,
          email: row.invitedBy.email,
          avatarUrl: row.invitedBy.avatarUrl,
        }
      : undefined,
  };
}

function computeEffectiveStatus(row: {
  status: string;
  expiresAt: Date;
}): SharedWorkspaceInvitation['status'] {
  if (row.status === 'pending' && row.expiresAt.getTime() < Date.now()) {
    return 'expired';
  }
  return row.status as SharedWorkspaceInvitation['status'];
}
