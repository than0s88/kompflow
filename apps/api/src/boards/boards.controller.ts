import {
  Body,
  Controller,
  Delete,
  Get,
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
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@Controller('boards')
@UseGuards(JwtAuthGuard)
export class BoardsController {
  constructor(
    private readonly boards: BoardsService,
    private readonly pusher: PusherService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.boards.listForUser(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBoardDto) {
    return this.boards.create(user.id, dto);
  }

  @Get(':id')
  show(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.boards.show(user.id, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBoardDto,
  ) {
    const board = await this.boards.update(user.id, id, dto);
    await this.pusher.broadcastBoardUpdated(id, user.id);
    return board;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  destroy(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.boards.destroy(user.id, id);
  }
}
