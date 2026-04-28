import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BoardsService } from '../boards/boards.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { ActivityService } from './activity.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(
    private readonly activity: ActivityService,
    private readonly workspaces: WorkspacesService,
    private readonly boards: BoardsService,
  ) {}

  @Get('workspaces/:id/activity')
  async forWorkspace(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    await this.workspaces.assertCanView(user.id, id);
    return this.activity.listForWorkspace(id, {
      limit: limit ? Number(limit) : undefined,
      before,
    });
  }

  @Get('boards/:id/activity')
  async forBoard(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    await this.boards.assertCanView(user.id, id);
    return this.activity.listForBoard(id, {
      limit: limit ? Number(limit) : undefined,
      before,
    });
  }
}
