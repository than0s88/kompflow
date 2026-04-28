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
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class CardsController {
  constructor(
    private readonly cards: CardsService,
    private readonly pusher: PusherService,
  ) {}

  @Post('columns/:columnId/cards')
  async create(
    @CurrentUser() user: AuthUser,
    @Param('columnId') columnId: string,
    @Body() dto: CreateCardDto,
  ) {
    const { card, boardId } = await this.cards.create(user.id, columnId, dto);
    await this.pusher.broadcastBoardUpdated(boardId, user.id);
    return card;
  }

  @Patch('cards/:id')
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCardDto,
  ) {
    const { card, boardId } = await this.cards.update(user.id, id, dto);
    await this.pusher.broadcastBoardUpdated(boardId, user.id);
    return card;
  }

  @Delete('cards/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async destroy(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const boardId = await this.cards.destroy(user.id, id);
    await this.pusher.broadcastBoardUpdated(boardId, user.id);
  }
}
