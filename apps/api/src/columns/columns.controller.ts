import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PusherService } from '../pusher/pusher.service';
import { ColumnsService } from './columns.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class ColumnsController {
  constructor(
    private readonly columns: ColumnsService,
    private readonly pusher: PusherService,
  ) {}

  @Post('boards/:boardId/columns')
  async create(
    @CurrentUser() user: AuthUser,
    @Param('boardId') boardId: string,
    @Body() dto: CreateColumnDto,
  ) {
    const column = await this.columns.create(user.id, boardId, dto);
    await this.pusher.broadcastBoardUpdated(boardId, user.id);
    return column;
  }

  @Patch('columns/:id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateColumnDto,
  ) {
    const column = await this.columns.update(user.id, id, dto);
    await this.pusher.broadcastBoardUpdated(column.boardId, user.id);
    return column;
  }

  @Delete('columns/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async destroy(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const boardId = await this.columns.destroy(user.id, id);
    await this.pusher.broadcastBoardUpdated(boardId, user.id);
  }
}
