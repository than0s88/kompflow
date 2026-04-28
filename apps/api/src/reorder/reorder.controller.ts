import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PusherService } from '../pusher/pusher.service';
import { ReorderDto } from './dto/reorder.dto';
import { ReorderService } from './reorder.service';

@Controller('boards/:boardId/reorder')
@UseGuards(JwtAuthGuard)
export class ReorderController {
  constructor(
    private readonly reorder: ReorderService,
    private readonly pusher: PusherService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async apply(
    @CurrentUser() user: AuthUser,
    @Param('boardId') boardId: string,
    @Body() dto: ReorderDto,
  ) {
    await this.reorder.apply(user.id, boardId, dto);
    await this.pusher.broadcastBoardUpdated(boardId, user.id);
  }
}
