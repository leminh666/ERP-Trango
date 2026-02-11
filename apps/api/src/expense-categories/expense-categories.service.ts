import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ExpenseCategoriesService {
  private readonly logger = new Logger(ExpenseCategoriesService.name);
  private readonly CODE_PREFIX = 'CC';
  private readonly MAX_RETRIES = 3;

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Extract numeric part from code, handling malformed codes like 'CC0NaN'
   */
  private extractNumericPart(code: string, prefix: string): number | null {
    if (!code || !code.startsWith(prefix)) {
      return null;
    }
    const numStr = code.substring(prefix.length);
    const num = parseInt(numStr, 10);
    return isNaN(num) ? null : num;
  }

  /**
   * Generate next code from highest existing number
   */
  private generateNextCode(prefix: string, highestNum: number): string {
    const nextNum = highestNum + 1;
    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  }

  async findAll(params: { search?: string; includeDeleted?: boolean }) {
    const { search, includeDeleted } = params;

    const where: Prisma.ExpenseCategoryWhereInput = {
      ...(includeDeleted ? {} : { deletedAt: null }),
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.expenseCategory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id, deletedAt: null },
    });

    if (!category) {
      throw new NotFoundException(`Danh mục chi không tồn tại`);
    }

    return category;
  }

  async create(data: Prisma.ExpenseCategoryCreateInput, userId?: string, userEmail?: string) {
    // VisualType validation (Phase 6 v6.1)
    const visualType = (data.visualType as string) || 'ICON';
    const iconKey = data.iconKey as string | undefined;
    const imageUrl = data.imageUrl as string | undefined;

    if (visualType === 'ICON' && (!iconKey || iconKey.trim() === '')) {
      throw new BadRequestException('Icon là bắt buộc khi chọn loại Icon');
    }
    if (visualType === 'IMAGE' && (!imageUrl || imageUrl.trim() === '')) {
      throw new BadRequestException('Logo ảnh là bắt buộc khi chọn loại Logo');
    }

    // =============================================================================
    // TRANSACTION WITH RETRY: Handle race condition for code generation
    // =============================================================================
    let result: any;
    let retries = 0;

    while (retries < this.MAX_RETRIES) {
      try {
        result = await this.prisma.$transaction(async (tx) => {
          // 1. Get all CC-prefixed categories within transaction, sorted by code
          const categories = await tx.expenseCategory.findMany({
            where: {
              code: {
                startsWith: this.CODE_PREFIX,
              },
            },
            orderBy: { code: 'desc' },
          });

          // 2. Find highest valid numeric part
          let highestNum = 0;
          for (const cat of categories) {
            const num = this.extractNumericPart(cat.code, this.CODE_PREFIX);
            if (num !== null && num > highestNum) {
              highestNum = num;
            }
          }

          // 3. Generate new code
          const newCode = this.generateNextCode(this.CODE_PREFIX, highestNum);
          this.logger.log(`[EXPENSE_CATEGORY_CREATE] Generated code: ${newCode} (highestNum: ${highestNum})`);

          // 4. Double-check code doesn't exist before creating
          const existing = await tx.expenseCategory.findUnique({
            where: { code: newCode },
          });

          if (existing) {
            this.logger.warn(`[EXPENSE_CATEGORY_CREATE] Code ${newCode} already exists in transaction!`);
            throw new Error('CODE_CONFLICT');
          }

          // 5. Create the category
          const category = await tx.expenseCategory.create({
            data: {
              name: data.name as string,
              code: newCode,
              visualType: visualType as any,
              iconKey: iconKey || null,
              imageUrl: imageUrl || null,
              color: data.color as string || '#ef4444',
            },
          });

          return category;
        });

        // Success - break out of retry loop
        this.logger.log(`[EXPENSE_CATEGORY_CREATE] Created category with code ${result.code}`);
        break;

      } catch (error) {
        // Check if it's a unique constraint violation (P2002) OR our CODE_CONFLICT
        if ((error instanceof Error && error.message === 'CODE_CONFLICT') ||
            (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
          retries++;
          this.logger.warn(
            `[EXPENSE_CATEGORY_CREATE] Duplicate code detected (attempt ${retries}/${this.MAX_RETRIES}), retrying...`
          );
          if (retries >= this.MAX_RETRIES) {
            this.logger.error('[EXPENSE_CATEGORY_CREATE] Max retries exceeded, giving up');
            throw new ConflictException('Không thể tạo mã danh mục, vui lòng thử lại');
          }
          // Small delay before retry to allow other transactions to complete
          await new Promise(resolve => setTimeout(resolve, 50 * retries));
          continue;
        }
        throw error;
      }
    }

    // Audit log for CREATE
    await this.auditService.log({
      entity: 'ExpenseCategory',
      entityId: result.id,
      action: 'CREATE',
      beforeJson: null,
      afterJson: result as any,
      userId: userId || 'system',
      userEmail,
    });

    return result;
  }

  async update(id: string, data: Prisma.ExpenseCategoryUpdateInput, userId?: string, userEmail?: string) {
    const existing = await this.findOne(id);
    const beforeJson = existing as any;

    // VisualType validation (Phase 6 v6.1)
    const visualType = (data.visualType as string) || existing.visualType;
    const iconKey = (data.iconKey as string | undefined) ?? existing.iconKey;
    const imageUrl = (data.imageUrl as string | undefined) ?? existing.imageUrl;

    if (visualType === 'ICON' && (!iconKey || iconKey.trim() === '')) {
      throw new BadRequestException('Icon là bắt buộc khi chọn loại Icon');
    }
    if (visualType === 'IMAGE' && (!imageUrl || imageUrl.trim() === '')) {
      throw new BadRequestException('Logo ảnh là bắt buộc khi chọn loại Logo');
    }

    const result = await this.prisma.expenseCategory.update({
      where: { id },
      data: { ...data, visualType: visualType as any },
    });

    // Audit log for UPDATE
    await this.auditService.log({
      entity: 'ExpenseCategory',
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

    const result = await this.prisma.expenseCategory.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    // Audit log for DELETE
    await this.auditService.log({
      entity: 'ExpenseCategory',
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
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Danh mục chi không tồn tại');
    }

    const beforeJson = category as any;
    const result = await this.prisma.expenseCategory.update({
      where: { id },
      data: { deletedAt: null, isActive: true },
    });

    // Audit log for RESTORE
    await this.auditService.log({
      entity: 'ExpenseCategory',
      entityId: result.id,
      action: 'RESTORE',
      beforeJson,
      afterJson: result as any,
      userId: userId || 'system',
      userEmail,
    });

    return result;
  }

  async getUsage(id: string, from?: string, to?: string, page = 1, limit = 20) {
    const category = await this.findOne(id);

    const where: Prisma.TransactionWhereInput = {
      expenseCategoryId: id,
      deletedAt: null,
    };

    // Date filter
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          wallet: true,
          project: true,
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    // Calculate totals
    const totals = await this.prisma.transaction.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
    });

    return {
      category,
      usage: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        totals: {
          count: totals._count,
          amount: totals._sum.amount?.toString() || '0',
        },
      },
    };
  }
}
