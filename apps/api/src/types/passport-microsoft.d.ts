declare module 'passport-microsoft' {
  import { Strategy as PassportStrategy } from 'passport-strategy';

  export interface Profile {
    id: string;
    displayName: string;
    name?: { familyName?: string; givenName?: string };
    emails?: { value: string; type?: string }[];
    photos?: { value: string }[];
    provider: 'microsoft';
    _json?: {
      userPrincipalName?: string;
      mail?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }

  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL?: string;
    scope?: string | string[];
    tenant?: string;
    authorizationURL?: string;
    tokenURL?: string;
  }

  export type VerifyCallback = (
    err?: Error | null,
    user?: unknown,
    info?: unknown,
  ) => void;

  export type VerifyFunction = (
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) => void | Promise<void>;

  export class Strategy extends PassportStrategy {
    constructor(options: StrategyOptions, verify: VerifyFunction);
    name: string;
  }
}
