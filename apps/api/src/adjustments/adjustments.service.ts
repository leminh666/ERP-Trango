import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface AdjustmentCreateDto {
  date: string;
  walletId: string;
  amount: number; // positive for increase, negative for decrease
  note?: string;
}

@Injectable()
export class AdjustmentsService {
  private readonly logger = new Logger(AdjustmentsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(params: {
    from?: string;
    to?: string;
    walletId?: string;
    includeDeleted?: boolean;
    userRole?: string;
  }) {
    const { from, to, walletId, includeDeleted } = params;

    const where: any = {
      ...(includeDeleted ? {} : { deletedAt: null }),
    };

    if (walletId) {
      where.walletId = walletId;
    }

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const adjustments = await this.prisma.walletAdjustment.findMany({
      where,
      include: {
        wallet: true,
      },
      orderBy: { date: 'desc' },
    });

    return adjustments;
  }

  async findOne(id: string) {
    const adjustment = await this.prisma.walletAdjustment.findFirst({
      where: { id, deletedAt: null },
      include: {
        wallet: true,
      },
    });

    if (!adjustment) {
      throw new NotFoundException('Điều chỉnh số dư không tồn tại');
    }

    return adjustment;
  }

  async create(data: AdjustmentCreateDto, userId: string, userEmail: string) {
    // Validate wallet exists
    const wallet = await this.prisma.wallet.findFirst({
      where: { id: data.walletId, deletedAt: null },
    });

    if (!wallet) {
      throw new BadRequestException('Ví không tồn tại');
    }

    if (data.amount === 0) {
      throw new BadRequestException('Số tiền điều chỉnh không được bằng 0');
    }

    const result = await this.prisma.walletAdjustment.create({
      data: {
        date: new Date(data.date),
        amount: data.amount,
        note: data.note,
        walletId: data.walletId,
        createdByUserId: userId,
      },
      include: {
        wallet: true,
      },
    });

    // Audit log for CREATE
    await this.auditService.log({
      entity: 'Adjustment',
      entityId: result.id,
      action: 'CREATE',
      beforeJson: null,
      afterJson: result as any,
      userId,
      userEmail,
    });

    return result;
  }

  async delete(id: string, userId: string, userEmail: string) {
    const existing = await this.findOne(id);
    const beforeJson = existing as any;

    const result = await this.prisma.walletAdjustment.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: {
        wallet: true,
      },
    });

    // Audit log for DELETE
    await this.auditService.log({
      entity: 'Adjustment',
      entityId: result.id,
      action: 'DELETE',
      beforeJson,
      afterJson: { ...result, deletedAt: result.deletedAt } as any,
      userId,
      userEmail,
    });

    return result;
  }

  async update(id: string, data: Partial<AdjustmentCreateDto>, userId: string, userEmail: string) {
    const existing = await this.prisma.walletAdjustment.findFirst({
      where: { id },
      include: { wallet: true },
    });

    if (!existing) {
      throw new NotFoundException('Điều chỉnh số dư không tồn tại');
    }

    const beforeJson = existing as any;

    // Validate amount if provided
    if (data.amount !== undefined && data.amount === 0) {
      throw new BadRequestException('Số tiền điều chỉnh không được bằng 0');
    }

    // Validate wallet if provided
    if (data.walletId) {
      const wallet = await this.prisma.wallet.findFirst({
        where: { id: data.walletId, deletedAt: null },
      });
      if (!wallet) {
        throw new BadRequestException('Ví không tồn tại');
      }
    }

    const result = await this.prisma.walletAdjustment.update({
      where: { id },
      data: {
        ...(data.date && { date: new Date(data.date) }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.note !== undefined && { note: data.note }),
        ...(data.walletId && { walletId: data.walletId }),
      },
      include: {
        wallet: true,
      },
    });

    // Audit log for UPDATE
    await this.auditService.log({
      entity: 'Adjustment',
      entityId: result.id,
      action: 'UPDATE',
      beforeJson,
      afterJson: result as any,
      userId,
      userEmail,
    });

    return result;
  }

  async restore(id: string, userId: string, userEmail: string) {
    const adj = await this.prisma.walletAdjustment.findFirst({
      where: { id },
    });

    if (!adj) {
      throw new NotFoundException('Điều chỉnh số dư không tồn tại');
    }

    const beforeJson = adj as any;
    const result = await this.prisma.walletAdjustment.update({
      where: { id },
      data: { deletedAt: null },
      include: {
        wallet: true,
      },
    });

    // Audit log for RESTORE
    await this.auditService.log({
      entity: 'Adjustment',
      entityId: result.id,
      action: 'RESTORE',
      beforeJson,
      afterJson: result as any,
      userId,
      userEmail,
    });

    return result;
  }
}

