import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface QueryDto {
  from?: string;
  to?: string;
  entity?: string;
  action?: string;
  userId?: string;
  q?: string;
  page?: string;
  pageSize?: string;
}

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // Only ADMIN can access audit logs
  private isAdmin(req: any): boolean {
    return req.user?.role === 'ADMIN';
  }

  @Get()
  async getAuditLogs(@Request() req: any, @Query() query: QueryDto) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Only ADMIN can access audit logs' };
    }

    const page = parseInt(query.page || '1', 10);
    const pageSize = parseInt(query.pageSize || '20', 10);
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: any = {};

    if (query.entity) {
      where.entity = query.entity;
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.userId) {
      where.byUserId = query.userId;
    }

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) {
        where.createdAt.gte = new Date(query.from);
      }
      if (query.to) {
        where.createdAt.lte = new Date(query.to);
      }
    }

    if (query.q) {
      where.OR = [
        { entityId: { contains: query.q } },
        { byUserEmail: { contains: query.q } },
      ];
    }

    const [items, total] = await Promise.all([
      this.auditService['prisma'].auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          entity: true,
          entityId: true,
          action: true,
          byUserId: true,
          byUserEmail: true,
          createdAt: true,
          ip: true,
        } as any,
      }),
      this.auditService['prisma'].auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  @Get(':id')
  async getAuditLogDetail(@Request() req: any, @Param('id') id: string) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Only ADMIN can access audit logs' };
    }

    const log = await this.auditService['prisma'].auditLog.findUnique({
      where: { id },
    });

    if (!log) {
      return { error: 'Not Found', message: 'Audit log not found' };
    }

    return log;
  }
}

