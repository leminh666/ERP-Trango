import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogInput {
  entity: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'SETTING_UPDATE' | 'STAGE_CHANGE' | 'UPDATE_DISCOUNT';
  beforeJson?: Record<string, any> | null;
  afterJson?: Record<string, any> | null;
  userId: string;
  userEmail?: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    try {
      // Skip if userId is invalid (null, undefined, or empty string)
      if (!input.userId || typeof input.userId !== 'string') {
        this.logger.debug(`Skipping audit log - invalid userId: ${input.userId}`);
        return;
      }

      await this.prisma.auditLog.create({
        data: {
          entity: input.entity,
          entityId: input.entityId,
          action: input.action,
          beforeJson: input.beforeJson as any || null,
          afterJson: input.afterJson as any || null,
          byUserId: input.userId,
          byUserEmail: input.userEmail || null,
          ip: input.ip || null,
          userAgent: input.userAgent || null,
        } as any,
      });
    } catch (error) {
      // Audit logging should not break the main flow
      this.logger.warn(`Failed to create audit log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async logWithReq(
    input: Omit<AuditLogInput, 'ip' | 'userAgent'>,
    req?: { ip?: string; headers?: Record<string, string> },
  ): Promise<void> {
    await this.log({
      ...input,
      ip: req?.ip ?? req?.headers?.['x-forwarded-for'] ?? req?.headers?.['x-real-ip'],
      userAgent: req?.headers?.['user-agent'],
    });
  }

  // Helper to mask sensitive data for settings
  maskSensitiveData(data: Record<string, any>): Record<string, any> {
    const masked = { ...data };
    const sensitiveKeys = ['apiKey', 'secret', 'password', 'token', 'key'];
    
    for (const key of Object.keys(masked)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
        masked[key] = '***';
      }
    }
    return masked;
  }
}

