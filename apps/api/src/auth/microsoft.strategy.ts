import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-microsoft';
import { AuthService } from './auth.service';

type DoneCallback = (err: Error | null, user?: unknown) => void;

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(
    config: ConfigService,
    private readonly auth: AuthService,
  ) {
    super({
      clientID: config.get<string>('MICROSOFT_CLIENT_ID') ?? 'unset',
      clientSecret: config.get<string>('MICROSOFT_CLIENT_SECRET') ?? 'unset',
      callbackURL:
        config.get<string>('MICROSOFT_CALLBACK_URL') ??
        'http://localhost:3001/api/auth/microsoft/callback',
      scope: ['user.read'],
      tenant: config.get<string>('MICROSOFT_TENANT') ?? 'common',
    });
    if (
      !config.get('MICROSOFT_CLIENT_ID') ||
      !config.get('MICROSOFT_CLIENT_SECRET')
    ) {
      console.warn(
        '[Auth] Microsoft OAuth disabled — set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET',
      );
    }
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: DoneCallback,
  ): Promise<void> {
    const email =
      profile.emails?.[0]?.value ?? profile._json?.userPrincipalName;
    const name = profile.displayName ?? email ?? 'Microsoft User';

    if (!email) {
      done(new Error('Microsoft profile is missing an email address'));
      return;
    }

    try {
      const user = await this.auth.findOrCreateMicrosoftUser({
        microsoftId: profile.id,
        email,
        name,
      });
      done(null, user);
    } catch (err) {
      done(err as Error);
    }
  }
}
