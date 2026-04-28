import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Pusher from 'pusher';
import type { BoardUpdatedEvent } from '@kanban/shared';

@Injectable()
export class PusherService {
  private readonly logger = new Logger(PusherService.name);
  private readonly pusher: Pusher | null;

  constructor(private readonly config: ConfigService) {
    const appId = config.get<string>('PUSHER_APP_ID');
    const key = config.get<string>('PUSHER_KEY');
    const secret = config.get<string>('PUSHER_SECRET');
    const cluster = config.get<string>('PUSHER_CLUSTER');

    if (!appId || !key || !secret || !cluster) {
      this.logger.warn('Pusher credentials missing — broadcasting disabled');
      this.pusher = null;
      return;
    }

    this.pusher = new Pusher({ appId, key, secret, cluster, useTLS: true });
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

  authorizeChannel(
    socketId: string,
    channel: string,
    userId: string,
  ): { auth: string } | null {
    if (!this.pusher) return null;
    return this.pusher.authorizeChannel(socketId, channel, {
      user_id: userId,
    });
  }
}
