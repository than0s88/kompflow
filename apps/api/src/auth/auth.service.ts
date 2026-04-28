import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

interface GoogleUserPayload {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash },
      select: PUBLIC_USER_SELECT,
    });

    return { user, token: this.signToken(user.id) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'This account uses social sign-in. Please continue with the matching provider.',
      );
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token: this.signToken(user.id),
    };
  }

  async findOrCreateGoogleUser(payload: GoogleUserPayload) {
    let user = await this.prisma.user.findUnique({
      where: { googleId: payload.googleId },
      select: PUBLIC_USER_SELECT,
    });
    if (user) return user;

    const byEmail = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });
    if (byEmail) {
      user = await this.prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleId: payload.googleId,
          avatarUrl: payload.avatarUrl ?? byEmail.avatarUrl,
        },
        select: PUBLIC_USER_SELECT,
      });
      return user;
    }

    user = await this.prisma.user.create({
      data: {
        email: payload.email,
        name: payload.name,
        googleId: payload.googleId,
        avatarUrl: payload.avatarUrl,
      },
      select: PUBLIC_USER_SELECT,
    });
    return user;
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_USER_SELECT,
    });
  }

  signToken(userId: string): string {
    return this.jwt.sign({ sub: userId });
  }
}
