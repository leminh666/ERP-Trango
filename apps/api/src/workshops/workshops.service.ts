import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class WorkshopsService {
  private readonly logger = new Logger(WorkshopsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(params?: { search?: string; includeDeleted?: boolean }) {
    const where: Prisma.WorkshopWhereInput = {
      ...(params?.includeDeleted ? {} : { deletedAt: null, isActive: true }),
    };

    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.workshop.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const workshop = await this.prisma.workshop.findFirst({
      where: { id, deletedAt: null },
    });

    if (!workshop) {
      throw new NotFoundException(`Xưởng không tồn tại`);
    }

    return workshop;
  }

  async create(data: Prisma.WorkshopCreateInput, userId?: string, userEmail?: string) {
    const lastWorkshop = await this.prisma.workshop.findFirst({
      orderBy: { code: 'desc' },
    });

    const lastCode = lastWorkshop ? parseInt(lastWorkshop.code.replace('X', '')) : 0;
    const newCode = `X${String(lastCode + 1).padStart(3, '0')}`;

    const result = await this.prisma.workshop.create({
      data: { ...data, code: newCode },
    });

    // Audit log for CREATE
    await this.auditService.log({
      entity: 'Workshop',
      entityId: result.id,
      action: 'CREATE',
      beforeJson: null,
      afterJson: result as any,
      userId: userId || 'system',
      userEmail,
    });

    return result;
  }

  async update(id: string, data: Prisma.WorkshopUpdateInput, userId?: string, userEmail?: string) {
    const existing = await this.findOne(id);
    const beforeJson = existing as any;

    const result = await this.prisma.workshop.update({
      where: { id },
      data,
    });

    // Audit log for UPDATE
    await this.auditService.log({
      entity: 'Workshop',
      entityId: result.id,
      action: 'UPDATE',
      beforeJson,
      afterJson: result as any,
      userId: userId || 'system',
      userEmail,
    });

    return result;
  }

  async delete(id: string, userId?: string, userEmail?: string) {
    const existing = await this.findOne(id);
    const beforeJson = existing as any;

    const result = await this.prisma.workshop.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    // Audit log for DELETE
    await this.auditService.log({
      entity: 'Workshop',
      entityId: result.id,
      action: 'DELETE',
      beforeJson,
      afterJson: { ...result, deletedAt: result.deletedAt } as any,
      userId: userId || 'system',
      userEmail,
    });

    return result;
  }

  async restore(id: string, userId?: string, userEmail?: string) {
    const workshop = await this.prisma.workshop.findFirst({
      where: { id },
    });

    if (!workshop) {
      throw new NotFoundException(`Xưởng không tồn tại`);
    }

    const beforeJson = workshop as any;
    const result = await this.prisma.workshop.update({
      where: { id },
      data: { deletedAt: null, isActive: true },
    });

    // Audit log for RESTORE
    await this.auditService.log({
      entity: 'Workshop',
      entityId: result.id,
      action: 'RESTORE',
      beforeJson,
      afterJson: result as any,
      userId: userId || 'system',
      userEmail,
    });

    return result;
  }
}
