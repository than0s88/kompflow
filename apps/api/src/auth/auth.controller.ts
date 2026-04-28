import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { type Request, type Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser, type AuthUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

const COOKIE_NAME = 'kanban_token';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.register(dto);
    this.setCookie(res, result.token);
    return { user: result.user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto);
    this.setCookie(res, result.token);
    return { user: result.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, {
      domain: this.config.get<string>('COOKIE_DOMAIN'),
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return { user };
  }

  // ---- Google OAuth ----

  @Get('google')
  @UseGuards(AuthGuard('google'))
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  googleStart(): void {
    // Passport handles the redirect to Google.
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: Request, @Res() res: Response): void {
    this.handleOAuthCallback(req, res, 'google');
  }

  @Get('microsoft')
  @UseGuards(AuthGuard('microsoft'))
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  microsoftStart(): void {
    // Passport handles the redirect to Microsoft.
  }

  @Get('microsoft/callback')
  @UseGuards(AuthGuard('microsoft'))
  microsoftCallback(@Req() req: Request, @Res() res: Response): void {
    this.handleOAuthCallback(req, res, 'microsoft');
  }

  private handleOAuthCallback(
    req: Request,
    res: Response,
    provider: string,
  ): void {
    const webOrigin =
      this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:5173';
    const user = req.user as { id: string } | undefined;
    if (!user) {
      res.redirect(`${webOrigin}/login?error=${provider}`);
      return;
    }
    const token = this.auth.signToken(user.id);
    this.setCookie(res, token);
    res.redirect(webOrigin);
  }

  private setCookie(res: Response, token: string) {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.config.get<string>('COOKIE_SECURE') === 'true',
      sameSite: 'lax',
      maxAge: SEVEN_DAYS_MS,
      domain: this.config.get<string>('COOKIE_DOMAIN'),
      path: '/',
    });
  }
}
