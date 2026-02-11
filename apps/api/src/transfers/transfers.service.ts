import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface TransferCreateDto {
  date: string;
  walletId: string;
  walletToId: string;
  amount: number;
  note?: string;
}

@Injectable()
export class TransfersService {
  private readonly logger = new Logger(TransfersService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(params: {
    from?: string;
    to?: string;
    walletId?: string;
    walletToId?: string;
    includeDeleted?: boolean;
    userRole?: string;
  }) {
    const { from, to, walletId, walletToId, includeDeleted } = params;

    const where: any = {
      type: 'TRANSFER',
      ...(includeDeleted ? {} : { deletedAt: null }),
    };

    if (walletId) {
      where.walletId = walletId;
    }

    if (walletToId) {
      where.walletToId = walletToId;
    }

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const transfers = await this.prisma.transaction.findMany({
      where,
      include: {
        wallet: true,
        walletTo: true,
      },
      orderBy: { date: 'desc' },
    });

    return transfers;
  }

  async findOne(id: string) {
    const transfer = await this.prisma.transaction.findFirst({
      where: { id, type: 'TRANSFER', deletedAt: null },
      include: {
        wallet: true,
        walletTo: true,
      },
    });

    if (!transfer) {
      throw new NotFoundException('Chuyển khoản nội bộ không tồn tại');
    }

    return transfer;
  }

  async create(data: TransferCreateDto, userId: string, userEmail: string) {
    // Validate wallets exist
    const [wallet, walletTo] = await Promise.all([
      this.prisma.wallet.findFirst({ where: { id: data.walletId, deletedAt: null } }),
      this.prisma.wallet.findFirst({ where: { id: data.walletToId, deletedAt: null } }),
    ]);

    if (!wallet) {
      throw new BadRequestException('Ví nguồn không tồn tại');
    }

    if (!walletTo) {
      throw new BadRequestException('Ví đích không tồn tại');
    }

    if (data.walletId === data.walletToId) {
      throw new BadRequestException('Ví nguồn và ví đích phải khác nhau');
    }

    if (data.amount <= 0) {
      throw new BadRequestException('Số tiền phải lớn hơn 0');
    }

    // Auto-generate code for transfer (CK = Chuyển khoản)
    const lastTx = await this.prisma.transaction.findFirst({
      orderBy: { code: 'desc' },
      where: { code: { startsWith: 'CK' } },
    });

    const lastCode = lastTx ? parseInt(lastTx.code.replace('CK', '')) : 0;
    const newCode = `CK${String(lastCode + 1).padStart(4, '0')}`;

    const result = await this.prisma.transaction.create({
      data: {
        code: newCode,
        type: 'TRANSFER',
        date: new Date(data.date),
        amount: data.amount,
        note: data.note,
        walletId: data.walletId,
        walletToId: data.walletToId,
        feeAmount: 0,
        createdByUserId: userId,
      },
      include: {
        wallet: true,
        walletTo: true,
      },
    });

    // Audit log for CREATE
    await this.auditService.log({
      entity: 'Transfer',
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

    const result = await this.prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: {
        wallet: true,
        walletTo: true,
      },
    });

    // Audit log for DELETE
    await this.auditService.log({
      entity: 'Transfer',
      entityId: result.id,
      action: 'DELETE',
      beforeJson,
      afterJson: { ...result, deletedAt: result.deletedAt } as any,
      userId,
      userEmail,
    });

    return result;
  }

  async update(id: string, data: Partial<TransferCreateDto>, userId: string, userEmail: string) {
    const existing = await this.prisma.transaction.findFirst({
      where: { id, type: 'TRANSFER' },
      include: { wallet: true, walletTo: true },
    });

    if (!existing) {
      throw new NotFoundException('Chuyển khoản nội bộ không tồn tại');
    }

    const beforeJson = existing as any;

    // Validate amount if provided
    if (data.amount !== undefined && data.amount <= 0) {
      throw new BadRequestException('Số tiền phải lớn hơn 0');
    }

    // Validate wallets if provided
    if (data.walletId || data.walletToId) {
      const walletId = data.walletId || existing.walletId;
      const walletToId = (data.walletToId || existing.walletToId)!;

      const [wallet, walletTo] = await Promise.all([
        this.prisma.wallet.findFirst({ where: { id: walletId, deletedAt: null } }),
        this.prisma.wallet.findFirst({ where: { id: walletToId, deletedAt: null } }),
      ]);

      if (!wallet) {
        throw new BadRequestException('Ví nguồn không tồn tại');
      }

      if (!walletTo) {
        throw new BadRequestException('Ví đích không tồn tại');
      }

      if (walletId === walletToId) {
        throw new BadRequestException('Ví nguồn và ví đích phải khác nhau');
      }
    }

    const result = await this.prisma.transaction.update({
      where: { id },
      data: {
        ...(data.date && { date: new Date(data.date) }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.note !== undefined && { note: data.note }),
        ...(data.walletId && { walletId: data.walletId }),
        ...(data.walletToId && { walletToId: data.walletToId }),
      },
      include: {
        wallet: true,
        walletTo: true,
      },
    });

    // Audit log for UPDATE
    await this.auditService.log({
      entity: 'Transfer',
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
    const tx = await this.prisma.transaction.findFirst({
      where: { id, type: 'TRANSFER' },
    });

    if (!tx) {
      throw new NotFoundException('Chuyển khoản nội bộ không tồn tại');
    }

    const beforeJson = tx as any;
    const result = await this.prisma.transaction.update({
      where: { id },
      data: { deletedAt: null },
      include: {
        wallet: true,
        walletTo: true,
      },
    });

    // Audit log for RESTORE
    await this.auditService.log({
      entity: 'Transfer',
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

