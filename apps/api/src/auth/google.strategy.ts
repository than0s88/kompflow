import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  type Profile,
  type VerifyCallback,
} from 'passport-google-oauth20';
import { AuthService } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private readonly auth: AuthService,
  ) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || 'unset',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') || 'unset',
      callbackURL:
        config.get<string>('GOOGLE_CALLBACK_URL') ??
        'http://localhost:3001/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
    if (
      !config.get('GOOGLE_CLIENT_ID') ||
      !config.get('GOOGLE_CLIENT_SECRET')
    ) {
      console.warn(
        '[Auth] Google OAuth disabled — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET',
      );
    }
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    const name = profile.displayName ?? email ?? 'Google User';
    const avatarUrl = profile.photos?.[0]?.value;

    if (!email) {
      done(new Error('Google profile is missing an email address'), false);
      return;
    }

    try {
      const user = await this.auth.findOrCreateGoogleUser({
        googleId: profile.id,
        email,
        name,
        avatarUrl,
      });
      done(null, user);
    } catch (err) {
      done(err as Error, false);
    }
  }
}
