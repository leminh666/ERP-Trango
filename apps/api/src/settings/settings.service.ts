import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface AiConfig {
  enabled: boolean;
  provider: 'mock' | 'openai';
  model: string;
  apiKey?: string;
  defaultWalletId?: string;
  defaultIncomeCategoryId?: string;
  defaultExpenseCategoryId?: string;
}

export interface ReminderScopes {
  cashbook: boolean;
  orders: boolean;
}

export interface ReminderConfig {
  enabled: boolean;
  timeWindows: string[];
  daysOfWeek: number[]; // 1=Monday, 7=Sunday
  graceMinutes: number;
  scopes: ReminderScopes;
}

export interface VoiceConfig {
  enabled: boolean;
  provider: 'browser';
  language: string;
  autoPunctuation: boolean;
  interimResults: boolean;
  maxSecondsPerSegment: number;
  pushToTalk: boolean;
}

export interface AuthSessionConfig {
  enabled: boolean;
  idleTimeoutMinutes: number;
  absoluteTimeoutMinutes: number;
}

export interface AuthSmtpConfig {
  enabled: boolean;
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
}

export interface AuthPasswordResetConfig {
  enabled: boolean;
  tokenExpireMinutes: number;
  smtp: AuthSmtpConfig;
}

export interface AuthGoogleOAuthConfig {
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  callbackUrl?: string;
}

export interface AuthConfig {
  rememberEmailDefault: boolean;
  session: AuthSessionConfig;
  passwordReset: AuthPasswordResetConfig;
  googleOAuth: AuthGoogleOAuthConfig;
}

export interface SystemSettings {
  ai: AiConfig;
  reminders: ReminderConfig;
  voice: VoiceConfig;
  auth: AuthConfig;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  private readonly CONFIG_KEYS = ['ai_config', 'reminder_config', 'voice_config', 'auth_config'];

  private readonly DEFAULT_AI_CONFIG: AiConfig = {
    enabled: false,
    provider: 'mock',
    model: 'gpt-4',
    apiKey: '',
    defaultWalletId: undefined,
    defaultIncomeCategoryId: undefined,
    defaultExpenseCategoryId: undefined,
  };

  private readonly DEFAULT_REMINDER_CONFIG: ReminderConfig = {
    enabled: false,
    timeWindows: ['09:00', '14:00', '17:00'],
    daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
    graceMinutes: 15,
    scopes: { cashbook: true, orders: true },
  };

  private readonly DEFAULT_VOICE_CONFIG: VoiceConfig = {
    enabled: false,
    provider: 'browser',
    language: 'vi-VN',
    autoPunctuation: true,
    interimResults: true,
    maxSecondsPerSegment: 30,
    pushToTalk: true,
  };

  private readonly DEFAULT_AUTH_CONFIG: AuthConfig = {
    rememberEmailDefault: true,
    session: {
      enabled: true,
      idleTimeoutMinutes: 30,
      absoluteTimeoutMinutes: 720,
    },
    passwordReset: {
      enabled: true,
      tokenExpireMinutes: 30,
      smtp: {
        enabled: false,
        host: undefined,
        port: undefined,
        user: undefined,
        pass: undefined,
        from: undefined,
      },
    },
    googleOAuth: {
      enabled: false,
      clientId: undefined,
      clientSecret: undefined,
      callbackUrl: undefined,
    },
  };

  async getSettings(userId: string): Promise<SystemSettings> {
    const settings = await this.prisma.systemSetting.findMany({
      where: { key: { in: this.CONFIG_KEYS } },
    });

    const settingsMap = new Map(settings.map((s) => [s.key, s.valueJson]));

    return {
      ai: this.parseConfig(settingsMap.get('ai_config'), this.DEFAULT_AI_CONFIG),
      reminders: this.parseConfig(settingsMap.get('reminder_config'), this.DEFAULT_REMINDER_CONFIG),
      voice: this.parseConfig(settingsMap.get('voice_config'), this.DEFAULT_VOICE_CONFIG),
      auth: this.parseConfig(settingsMap.get('auth_config'), this.DEFAULT_AUTH_CONFIG),
    };
  }

  async getAuthConfig(): Promise<AuthConfig> {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key: 'auth_config' } });
    return this.parseConfig(setting?.valueJson, this.DEFAULT_AUTH_CONFIG);
  }

  async updateSettings(userId: string, payload: Partial<SystemSettings>, reqUserEmail?: string): Promise<any> {
    const before = await this.getSettings(userId);

    if (payload.ai !== undefined) {
      await this.updateConfig('ai_config', payload.ai);
    }
    if (payload.reminders !== undefined) {
      await this.updateConfig('reminder_config', payload.reminders);
    }
    if (payload.voice !== undefined) {
      await this.updateConfig('voice_config', payload.voice);
    }
    if (payload.auth !== undefined) {
      const validated = this.validateAuthConfig(payload.auth as AuthConfig);
      await this.updateConfig('auth_config', validated);
    }

    await this.auditLog('system', before, payload, userId, reqUserEmail);
    return { success: true, message: 'Cập nhật cấu hình thành công' };
  }

  async updateSettingsDebug(userId: string, payload: any, reqUserEmail?: string): Promise<any> {
    // Simple debug method - just return what we received
    return { success: true, received: payload };
  }

  private validateAuthConfig(input: AuthConfig): AuthConfig {
    const rememberEmailDefault = !!input.rememberEmailDefault;

    const sessionEnabled = input.session?.enabled !== undefined ? !!input.session.enabled : true;
    const idle = Number(input.session?.idleTimeoutMinutes);
    const abs = Number(input.session?.absoluteTimeoutMinutes);
    const idleTimeoutMinutes = Number.isFinite(idle) ? idle : this.DEFAULT_AUTH_CONFIG.session.idleTimeoutMinutes;
    const absoluteTimeoutMinutes = Number.isFinite(abs) ? abs : this.DEFAULT_AUTH_CONFIG.session.absoluteTimeoutMinutes;

    if (idleTimeoutMinutes <= 0 || idleTimeoutMinutes > 24 * 60) {
      throw new BadRequestException('Idle timeout phải trong khoảng 1 đến 1440 phút');
    }
    if (absoluteTimeoutMinutes <= 0 || absoluteTimeoutMinutes > 7 * 24 * 60) {
      throw new BadRequestException('Absolute timeout phải trong khoảng 1 đến 10080 phút');
    }
    if (absoluteTimeoutMinutes < idleTimeoutMinutes) {
      throw new BadRequestException('Absolute timeout phải lớn hơn hoặc bằng idle timeout');
    }

    const passwordResetEnabled = !!input.passwordReset?.enabled;
    const tokenExpireMinutes = Number(input.passwordReset?.tokenExpireMinutes);
    const tokenExpire = Number.isFinite(tokenExpireMinutes) ? tokenExpireMinutes : 30;
    if (tokenExpire <= 0 || tokenExpire > 24 * 60) {
      throw new BadRequestException('Thời gian hết hạn token reset phải trong khoảng 1 đến 1440 phút');
    }

    const smtpEnabled = !!input.passwordReset?.smtp?.enabled;
    const smtp = {
      enabled: smtpEnabled,
      host: input.passwordReset?.smtp?.host,
      port: input.passwordReset?.smtp?.port,
      user: input.passwordReset?.smtp?.user,
      pass: input.passwordReset?.smtp?.pass,
      from: input.passwordReset?.smtp?.from,
    } as AuthSmtpConfig;

    if (smtp.enabled) {
      if (!smtp.host || !smtp.port || !smtp.user || !smtp.pass || !smtp.from) {
        throw new BadRequestException('SMTP: Vui lòng nhập đủ host/port/user/pass/from');
      }
    }

    const googleEnabled = !!input.googleOAuth?.enabled;
    const googleOAuth: AuthGoogleOAuthConfig = {
      enabled: googleEnabled,
      clientId: input.googleOAuth?.clientId,
      clientSecret: input.googleOAuth?.clientSecret,
      callbackUrl: input.googleOAuth?.callbackUrl,
    };

    if (googleOAuth.enabled) {
      if (!googleOAuth.clientId || !googleOAuth.clientSecret || !googleOAuth.callbackUrl) {
        throw new BadRequestException('Google OAuth: Vui lòng nhập đủ clientId/clientSecret/callbackUrl');
      }
    }

    return {
      rememberEmailDefault,
      session: {
        enabled: sessionEnabled,
        idleTimeoutMinutes,
        absoluteTimeoutMinutes,
      },
      passwordReset: {
        enabled: passwordResetEnabled,
        tokenExpireMinutes: tokenExpire,
        smtp,
      },
      googleOAuth,
    };
  }

  private async auditLog(entityId: string, beforeJson: any, afterJson: any, userId: string, userEmail?: string) {
    const maskedAfter = { ...afterJson };
    if ((maskedAfter as any).apiKey) {
      (maskedAfter as any).apiKey = '***';
    }
    if ((maskedAfter as any)?.passwordReset?.smtp?.pass) {
      (maskedAfter as any).passwordReset.smtp.pass = '***';
    }
    if ((maskedAfter as any)?.googleOAuth?.clientSecret) {
      (maskedAfter as any).googleOAuth.clientSecret = '***';
    }

    await this.auditService.log({
      entity: 'Settings',
      entityId,
      action: 'SETTING_UPDATE',
      beforeJson,
      afterJson: maskedAfter,
      userId,
      userEmail,
    });
  }

  private async updateConfig(key: string, value: any): Promise<void> {
    await this.prisma.systemSetting.upsert({
      where: { key },
      update: { valueJson: JSON.stringify(value), updatedAt: new Date() },
      create: { key, valueJson: JSON.stringify(value) },
    });
  }

  private parseConfig<T>(stored: string | undefined, defaults: T): T {
    if (!stored) return defaults;
    try {
      return { ...defaults, ...JSON.parse(stored) };
    } catch {
      return defaults;
    }
  }

  async getWallets() {
    return this.prisma.wallet.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async getIncomeCategories() {
    return this.prisma.incomeCategory.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async getExpenseCategories() {
    return this.prisma.expenseCategory.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}
