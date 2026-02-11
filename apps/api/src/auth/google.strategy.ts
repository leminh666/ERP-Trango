import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import { AuthService } from './auth.service';

interface GoogleAuthConfig {
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  callbackUrl?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly authService: AuthService,
  ) {
    // Strategy only instantiated when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars exist
    super({
      passReqToCallback: true,
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    request: any,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails, photos } = profile;
    const email = emails?.[0]?.value;

    if (!email) {
      return done(new Error('No email found from Google profile'), false);
    }

    const user = await this.authService.validateOAuthUser({
      email,
      name: name?.givenName && name?.familyName ? `${name.givenName} ${name.familyName}` : name?.givenName || email.split('@')[0],
      avatarUrl: photos?.[0]?.value,
    });

    done(null, user);
  }

  // Override authenticate to check dynamic config from settings when env vars not used
  authenticate(req: any, options?: any): void {
    // Check if we should use settings DB config (for admin toggle)
    const useSettingsConfig = !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET;

    if (!useSettingsConfig) {
      // Env vars configured - use default behavior
      super.authenticate(req, options);
      return;
    }

    // Check settings DB config
    this.settingsService.getAuthConfig().then(authConfig => {
      const googleConfig = authConfig?.googleOAuth as GoogleAuthConfig | undefined;
      
      if (!googleConfig?.enabled || !googleConfig?.clientId || !googleConfig?.clientSecret) {
        return this.fail({ message: 'Google OAuth chưa được cấu hình trong hệ thống' }, 400);
      }

      const googleOptions = {
        ...options,
        clientID: googleConfig.clientId,
        clientSecret: googleConfig.clientSecret,
        callbackURL: googleConfig.callbackUrl || 'http://localhost:4000/auth/google/callback',
        scope: ['email', 'profile'],
      };

      super.authenticate(req, googleOptions);
    }).catch(err => {
      this.error(err);
    });
  }
}
