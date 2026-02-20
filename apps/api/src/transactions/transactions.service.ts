import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(params: {
    type?: string;
    from?: Date;
    to?: Date;
    walletId?: string;
    projectId?: string;
    customerId?: string; // Filter by customer via project
    isCommonCost?: boolean;
    incomeCategoryId?: string;
    expenseCategoryId?: string;
    includeDeleted?: boolean;
    search?: string;
    take?: number;
    orderBy?: string;
  }) {
    const {
      type,
      from,
      to,
      walletId,
      projectId,
      customerId,
      isCommonCost,
      incomeCategoryId,
      expenseCategoryId,
      includeDeleted,
      search,
      take,
      orderBy,
    } = params;

    const where: Prisma.TransactionWhereInput = {
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(type ? { type: type as any } : {}),
      ...(walletId ? { walletId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(isCommonCost !== undefined && isCommonCost !== null ? { isCommonCost } : {}),
      ...(incomeCategoryId ? { incomeCategoryId } : {}),
      ...(expenseCategoryId ? { expenseCategoryId } : {}),
      ...(from && to ? { date: { gte: from, lte: to } } : {}),
      ...(search ? {
        OR: [
          { note: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
      // Filter by customer via project relationship
      ...(customerId ? {
        project: {
          customerId: customerId
        }
      } : {}),
    };

    return this.prisma.transaction.findMany({
      where,
      orderBy: orderBy ? { date: orderBy === 'asc' ? 'asc' : 'desc' } : { date: 'desc' },
      take: take || 100,
      include: {
        wallet: true,
        incomeCategory: true,
        expenseCategory: true,
        project: true, // Include project for edit modal to show linked order
      },
    });
  }

  async findOne(id: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, deletedAt: null },
      include: {
        wallet: true,
        incomeCategory: true,
        expenseCategory: true,
        project: true, // Include project for edit modal to show linked order
      },
    });

    if (!transaction) {
      throw new NotFoundException('Phiếu giao dịch không tồn tại');
    }

    return transaction;
  }

  async create(data: Prisma.TransactionCreateInput, userId?: string, userEmail?: string) {
    // Validation rules
    if (data.type === 'INCOME') {
      if (!data.wallet?.connect?.id) {
        throw new BadRequestException('Phiếu thu bắt buộc chọn Ví');
      }
      if (!data.incomeCategory?.connect?.id) {
        throw new BadRequestException('Phiếu thu bắt buộc chọn Danh mục thu');
      }
      if (data.expenseCategory?.connect?.id) {
        throw new BadRequestException('Phiếu thu không được chọn Danh mục chi');
      }
      if (data.isCommonCost === true) {
        throw new BadRequestException('Phiếu thu không được là Chi phí chung');
      }
    }

    if (data.type === 'EXPENSE') {
      if (!data.wallet?.connect?.id) {
        throw new BadRequestException('Phiếu chi bắt buộc chọn Ví');
      }
      
      // Check if this is an ads expense
      const isAds = data.isAds === true;
      
      // If not ads, require expense category
      if (!isAds && !data.expenseCategory?.connect?.id) {
        throw new BadRequestException('Phiếu chi bắt buộc chọn Danh mục chi');
      }
      // If ads, expense category is optional (not allowed)
      if (isAds && data.expenseCategory?.connect?.id) {
        throw new BadRequestException('Phiếu chi quảng cáo không được chọn Danh mục chi');
      }
      // If ads, require adsPlatform
      if (isAds && !data.adsPlatform) {
        throw new BadRequestException('Phiếu chi quảng cáo bắt buộc chọn Nền tảng');
      }
      if (data.incomeCategory?.connect?.id) {
        throw new BadRequestException('Phiếu chi không được chọn Danh mục thu');
      }
      
      const isCommonCost = data.isCommonCost as boolean;
      const projectId = (data.project?.connect as any)?.id;
      const hasProjectId = !!projectId && projectId.trim() !== '';
      
      // Ads expenses don't require project or common cost - they are standalone
      if (!isAds && !isCommonCost && !hasProjectId) {
        throw new BadRequestException('Phiếu chi phải gán đơn hàng hoặc chọn Chi phí chung');
      }
      if (!isAds && isCommonCost && hasProjectId) {
        throw new BadRequestException('Chi phí chung không được gán đơn hàng');
      }
    }

    // Auto-generate code
    const prefix = data.type === 'INCOME' ? 'PT' : 'PC';
    const lastTx = await this.prisma.transaction.findFirst({
      orderBy: { code: 'desc' },
      where: { code: { startsWith: prefix } },
    });
    
    const lastCode = lastTx ? parseInt(lastTx.code.replace(prefix, '')) : 0;
    const newCode = `${prefix}${String(lastCode + 1).padStart(4, '0')}`;

    // If isAds=true, auto-assign "Marketing" category
    let expenseCategory = data.expenseCategory;
    if (data.isAds === true && !data.expenseCategory?.connect?.id) {
      // Find or create "Marketing" category
      let marketingCategory = await this.prisma.expenseCategory.findFirst({
        where: { 
          name: { contains: 'Marketing', mode: 'insensitive' },
          deletedAt: null,
        },
      });
      
      if (!marketingCategory) {
        // Get max code to generate new one
        const lastCategory = await this.prisma.expenseCategory.findFirst({
          orderBy: { code: 'desc' },
        });
        const lastCode = lastCategory ? parseInt(lastCategory.code.replace(/[^0-9]/g, '')) : 0;
        const newCode = `EXP${String(lastCode + 1).padStart(4, '0')}`;
        
        // Create Marketing category if not exists
        marketingCategory = await this.prisma.expenseCategory.create({
          data: {
            code: newCode,
            name: 'Marketing',
            isActive: true,
          },
        });
      }
      
      expenseCategory = { connect: { id: marketingCategory.id } };
    }

    // Construct data object explicitly to avoid issues with spread operator
    const createData: any = {
      type: data.type,
      date: new Date(data.date as string),
      amount: data.amount, // Prisma handles conversion
      code: newCode,
      createdByUserId: userId,
      note: data.note || null,
      isCommonCost: data.isCommonCost === true,
      isAds: data.isAds === true,
      adsPlatform: data.adsPlatform || null,
      wallet: data.wallet,
      incomeCategory: data.incomeCategory,
      expenseCategory: expenseCategory,
      project: data.project,
      workshopId: data.workshopId,
      workshopJob: data.workshopJob,
    };

    const result = await this.prisma.transaction.create({
      data: createData,
    });

    // Audit log for CREATE
    await this.auditService.log({
      entity: 'Transaction',
      entityId: result.id,
      action: 'CREATE',
      beforeJson: null,
      afterJson: result as any,
      userId: userId || 'system',
      userEmail,
    });

    return result;
  }

  async update(id: string, data: Prisma.TransactionUpdateInput, userId?: string, userEmail?: string) {
    const existing = await this.findOne(id);
    const beforeJson = existing as any;

    // BẢO VỆ PROJECTID: Nếu transaction đã có projectId, không cho phép thay đổi hoặc xóa
    if (existing.projectId) {
      const newProjectId = (data.project as any)?.disconnect === true ? null : (data.project as any)?.connect?.id;
      if (newProjectId !== undefined && newProjectId !== existing.projectId) {
        throw new BadRequestException('Không thể thay đổi đơn hàng của phiếu giao dịch đã tạo');
      }
      // Nếu payload không chứa project thì giữ nguyên (Prisma sẽ không thay đổi)
    }

    // Validation rules (same as create)
    if (data.type === 'INCOME' || (data.type === undefined && existing.type === 'INCOME')) {
      const walletId = (data.wallet as any)?.connect?.id || existing.walletId;
      const incomeCatId = (data.incomeCategory as any)?.connect?.id || existing.incomeCategoryId;
      const expenseCatId = (data.expenseCategory as any)?.connect?.id || existing.expenseCategoryId;
      const isCommonCost = (data.isCommonCost as boolean) ?? existing.isCommonCost;

      if (!walletId) {
        throw new BadRequestException('Phiếu thu bắt buộc chọn Ví');
      }
      if (!incomeCatId) {
        throw new BadRequestException('Phiếu thu bắt buộc chọn Danh mục thu');
      }
      if (expenseCatId) {
        throw new BadRequestException('Phiếu thu không được chọn Danh mục chi');
      }
      if (isCommonCost) {
        throw new BadRequestException('Phiếu thu không được là Chi phí chung');
      }
    }

    if (data.type === 'EXPENSE' || (data.type === undefined && existing.type === 'EXPENSE')) {
      const walletId = (data.wallet as any)?.connect?.id || existing.walletId;
      const expenseCatId = (data.expenseCategory as any)?.connect?.id || existing.expenseCategoryId;
      const incomeCatId = (data.incomeCategory as any)?.connect?.id || existing.incomeCategoryId;
      const isCommonCost = (data.isCommonCost as boolean) ?? existing.isCommonCost;
      const projectId = (data.project as any)?.connect?.id || existing.projectId;

      if (!walletId) {
        throw new BadRequestException('Phiếu chi bắt buộc chọn Ví');
      }
      if (!expenseCatId) {
        throw new BadRequestException('Phiếu chi bắt buộc chọn Danh mục chi');
      }
      if (incomeCatId) {
        throw new BadRequestException('Phiếu chi không được chọn Danh mục thu');
      }
      
      if (!isCommonCost && !projectId) {
        throw new BadRequestException('Phiếu chi phải gán đơn hàng hoặc chọn Chi phí chung');
      }
      if (isCommonCost && projectId) {
        throw new BadRequestException('Chi phí chung không được gán đơn hàng');
      }
    }

    const result = await this.prisma.transaction.update({
      where: { id },
      data: {
        ...data,
        updatedByUserId: userId,
      },
    });

    // Audit log for UPDATE
    await this.auditService.log({
      entity: 'Transaction',
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
    
    const result = await this.prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit log for DELETE (soft delete)
    await this.auditService.log({
      entity: 'Transaction',
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
    const tx = await this.prisma.transaction.findFirst({ where: { id } });
    
    if (!tx) {
      throw new NotFoundException('Phiếu giao dịch không tồn tại');
    }

    const beforeJson = tx as any;
    const result = await this.prisma.transaction.update({
      where: { id },
      data: { deletedAt: null },
    });

    // Audit log for RESTORE
    await this.auditService.log({
      entity: 'Transaction',
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
