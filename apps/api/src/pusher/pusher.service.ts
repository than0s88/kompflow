import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Pusher from 'pusher';
import type { ActivityRecord, BoardUpdatedEvent } from '@kanban/shared';

@Injectable()
export class PusherService {
  private readonly logger = new Logger(PusherService.name);
  private readonly pusher: Pusher | null;

  constructor(private readonly config: ConfigService) {
    const appId = config.get<string>('PUSHER_APP_ID');
    const key = config.get<string>('PUSHER_KEY');
    const secret = config.get<string>('PUSHER_SECRET');
    const cluster = config.get<string>('PUSHER_CLUSTER') ?? 'mt1';
    const host = config.get<string>('PUSHER_HOST');
    const portRaw = config.get<string>('PUSHER_PORT');
    const useTLS = (config.get<string>('PUSHER_USE_TLS') ?? 'true') !== 'false';

    if (!appId || !key || !secret) {
      this.logger.warn('Pusher credentials missing — broadcasting disabled');
      this.pusher = null;
      return;
    }

    const options: Record<string, unknown> = {
      appId,
      key,
      secret,
      cluster,
      useTLS,
    };
    if (host) {
      options.host = host;
      options.port = portRaw ? Number(portRaw) : useTLS ? 443 : 80;
    }

    this.pusher = new Pusher(
      options as unknown as ConstructorParameters<typeof Pusher>[0],
    );
    this.logger.log(
      `Pusher broadcaster ready — host=${host ?? 'cloud'} cluster=${cluster} useTLS=${useTLS}`,
    );
  }

  async broadcastBoardUpdated(
    boardId: string,
    actorUserId: string | null,
  ): Promise<void> {
    if (!this.pusher) return;
    const payload: BoardUpdatedEvent = { boardId, actorUserId };
    try {
      await this.pusher.trigger(
        `private-board-${boardId}`,
        'board.updated',
        payload,
      );
    } catch (err) {
      this.logger.error('Pusher broadcast failed', err);
    }
  }

  async broadcastWorkspaceActivity(
    workspaceId: string,
    activity: ActivityRecord,
  ): Promise<void> {
    if (!this.pusher) return;
    try {
      await this.pusher.trigger(
        `private-workspace-${workspaceId}`,
        'activity.created',
        activity,
      );
      if (activity.boardId) {
        await this.pusher.trigger(
          `private-board-${activity.boardId}`,
          'activity.created',
          activity,
        );
      }
    } catch (err) {
      this.logger.error('Pusher activity broadcast failed', err);
    }
  }

  authorizeChannel(
    socketId: string,
    channel: string,
    userId: string,
  ): { auth: string } | null {
    if (!this.pusher) return null;
    return this.pusher.authorizeChannel(socketId, channel, { user_id: userId });
  }
}
