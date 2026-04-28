import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InvitationsService } from './invitations.service';

@Controller()
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  // --- Authed: workspace admin operations ---

  @Post('workspaces/:id/invitations')
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser() user: AuthUser,
    @Param('id') workspaceId: string,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitations.create(user.id, workspaceId, dto);
  }

  @Get('workspaces/:id/invitations')
  @UseGuards(JwtAuthGuard)
  async list(@CurrentUser() user: AuthUser, @Param('id') workspaceId: string) {
    return this.invitations.listForWorkspace(user.id, workspaceId);
  }

  @Delete('invitations/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @CurrentUser() user: AuthUser,
    @Param('id') invitationId: string,
  ): Promise<void> {
    await this.invitations.revoke(user.id, invitationId);
  }

  // --- Public: pre-auth preview of an invite link ---

  @Get('invitations/preview/:token')
  async preview(@Param('token') token: string) {
    return this.invitations.preview(token);
  }

  // --- Authed: accept ---

  @Post('invitations/accept')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async accept(
    @CurrentUser() user: AuthUser,
    @Body() dto: AcceptInvitationDto,
  ) {
    return this.invitations.accept(user.id, user.email, dto.token);
  }
}
