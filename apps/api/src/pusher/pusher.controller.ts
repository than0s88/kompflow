import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BoardsService } from '../boards/boards.service';
import { PusherService } from './pusher.service';

interface PusherAuthBody {
  socket_id: string;
  channel_name: string;
}

@Controller('pusher')
@UseGuards(JwtAuthGuard)
export class PusherController {
  constructor(
    private readonly pusher: PusherService,
    private readonly boards: BoardsService,
  ) {}

  @Post('auth')
  async auth(@CurrentUser() user: AuthUser, @Body() body: PusherAuthBody) {
    if (!body?.socket_id || !body?.channel_name) {
      throw new BadRequestException('socket_id and channel_name required');
    }

    if (!body.channel_name.startsWith('private-board-')) {
      throw new ForbiddenException('Unsupported channel');
    }

    const boardId = body.channel_name.slice('private-board-'.length);
    await this.boards.assertCanView(user.id, boardId);

    const result = this.pusher.authorizeChannel(
      body.socket_id,
      body.channel_name,
      user.id,
    );
    if (!result) throw new ForbiddenException('Pusher not configured');
    return result;
  }
}
