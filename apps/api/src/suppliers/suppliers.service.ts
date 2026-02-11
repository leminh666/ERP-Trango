import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(params?: { search?: string; includeDeleted?: boolean }) {
    const where: Prisma.SupplierWhereInput = {
      ...(params?.includeDeleted ? {} : { deletedAt: null, isActive: true }),
    };

    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.supplier.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
    });

    if (!supplier) {
      throw new NotFoundException(`Nhà cung cấp không tồn tại`);
    }

    return supplier;
  }

  async create(data: Prisma.SupplierCreateInput, userId?: string, userEmail?: string) {
    const lastSupplier = await this.prisma.supplier.findFirst({
      orderBy: { code: 'desc' },
    });

    const lastCode = lastSupplier ? parseInt(lastSupplier.code.replace('NCC', '')) : 0;
    const newCode = `NCC${String(lastCode + 1).padStart(4, '0')}`;

    const result = await this.prisma.supplier.create({
      data: { ...data, code: newCode },
    });

    // Audit log for CREATE
    await this.auditService.log({
      entity: 'Supplier',
      entityId: result.id,
      action: 'CREATE',
      beforeJson: null,
      afterJson: result as any,
      userId: userId || 'system',
      userEmail,
    });

    return result;
  }

  async update(id: string, data: Prisma.SupplierUpdateInput, userId?: string, userEmail?: string) {
    const existing = await this.findOne(id);
    const beforeJson = existing as any;

    const result = await this.prisma.supplier.update({
      where: { id },
      data,
    });

    // Audit log for UPDATE
    await this.auditService.log({
      entity: 'Supplier',
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

    const result = await this.prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    // Audit log for DELETE
    await this.auditService.log({
      entity: 'Supplier',
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
    const supplier = await this.prisma.supplier.findFirst({
      where: { id },
    });

    if (!supplier) {
      throw new NotFoundException(`Nhà cung cấp không tồn tại`);
    }

    const beforeJson = supplier as any;
    const result = await this.prisma.supplier.update({
      where: { id },
      data: { deletedAt: null, isActive: true },
    });

    // Audit log for RESTORE
    await this.auditService.log({
      entity: 'Supplier',
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
