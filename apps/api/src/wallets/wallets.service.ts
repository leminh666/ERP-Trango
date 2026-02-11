import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

// =============================================================================
// HELPER: Generate next code with prefix
// =============================================================================
function generateNextCode(prefix: string, lastCode: number | null): string {
  const nextNum = (lastCode || 0) + 1;
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

// Helper to extract numeric part from code
function extractNumericPart(code: string, prefix: string): number | null {
  const numericPart = code.startsWith(prefix)
    ? code.slice(prefix.length)
    : code;
  const num = parseInt(numericPart, 10);
  // Return null if NaN (invalid code format)
  return isNaN(num) ? null : num;
}

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);
  private readonly CODE_PREFIX = 'W';
  private readonly MAX_RETRIES = 3;

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(params: { search?: string; includeDeleted?: boolean; userRole?: string }) {
    const { search, includeDeleted } = params;
    const where: Prisma.WalletWhereInput = {
      ...(includeDeleted ? {} : { deletedAt: null }),
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }
    const wallets = await this.prisma.wallet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    // Calculate balance for each wallet from transactions
    const walletsWithBalance = await Promise.all(
      wallets.map(async (wallet) => {
        // Calculate balance: INCOME - EXPENSE
        const transactions = await this.prisma.transaction.findMany({
          where: {
            walletId: wallet.id,
            deletedAt: null,
            // Only count non-transfer transactions for balance
            type: { in: ['INCOME', 'EXPENSE'] },
          },
          select: {
            type: true,
            amount: true,
          },
        });

        let balance = 0;
        for (const tx of transactions) {
          if (tx.type === 'INCOME') {
            balance += Number(tx.amount || 0);
          } else if (tx.type === 'EXPENSE') {
            balance -= Number(tx.amount || 0);
          }
        }

        return {
          ...wallet,
          balance,
        };
      })
    );

    return walletsWithBalance;
  }

  async findOne(id: string) {
    const wallet = await this.prisma.wallet.findFirst({
      where: { id, deletedAt: null },
    });
    if (!wallet) {
      throw new NotFoundException('Sổ quỹ không tồn tại');
    }
    return wallet;
  }

  async create(data: {
    name?: string;
    type?: string;
    iconType: string;
    iconKey?: string;
    imageUrl?: string;
    note?: string;
    openingBalance?: number;
  }, userId?: string, userEmail?: string, userRole?: string) {
    if (userRole !== 'ADMIN') {
      throw new BadRequestException('Chỉ ADMIN được thực hiện thao tác này');
    }

    // Validate name
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new BadRequestException('Tên sổ quỹ là bắt buộc');
    }

    // VisualType validation
    const visualType = data.iconType || 'ICON';
    const iconKey = data.iconKey;
    const imageUrl = data.imageUrl;

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
          // 1. Get all W-prefixed wallets within transaction, sorted by code
          const wWallets = await tx.wallet.findMany({
            where: {
              code: {
                startsWith: this.CODE_PREFIX,
              },
            },
            orderBy: { code: 'desc' },
          });

          // 2. Find the highest valid numeric code
          let highestNum = 0;
          for (const wallet of wWallets) {
            const num = extractNumericPart(wallet.code, this.CODE_PREFIX);
            if (num !== null && num > highestNum) {
              highestNum = num;
            }
          }

          const newCode = generateNextCode(this.CODE_PREFIX, highestNum);
          this.logger.log(`[WALLET_CREATE] Highest existing num: ${highestNum}, new code: ${newCode}`);

          // 3. Double-check if this code exists (in case of race)
          const existingWallet = await tx.wallet.findUnique({
            where: { code: newCode },
          });

          if (existingWallet) {
            this.logger.warn(`[WALLET_CREATE] Code ${newCode} already exists!`);
            throw new ConflictException('Mã đã tồn tại, vui lòng thử lại');
          }

          // 4. Create wallet WITHIN transaction
          const wallet = await tx.wallet.create({
            data: {
              name: data.name!,  // Already validated above
              type: (data.type as any) || 'CASH',
              code: newCode,
              visualType: visualType as any,
              iconKey: iconKey || 'wallet',
              imageUrl: imageUrl || null,
              note: data.note || null,
            },
          });

          // 4. Create opening balance adjustment within transaction
          const openingBalance = data.openingBalance || 0;
          if (openingBalance !== 0) {
            await tx.walletAdjustment.create({
              data: {
                walletId: wallet.id,
                date: new Date(),
                amount: openingBalance,
                note: 'Số dư ban đầu',
                createdByUserId: userId || 'system',
              },
            });
          }

          return wallet;
        });

        // Success - break out of retry loop
        this.logger.log(`[WALLET_CREATE] Created wallet with code ${result.code}`);
        break;

      } catch (error) {
        // Check if it's a unique constraint violation (P2002)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          retries++;
          this.logger.warn(
            `[WALLET_CREATE] Duplicate code detected (attempt ${retries}/${this.MAX_RETRIES}), retrying...`
          );

          if (retries >= this.MAX_RETRIES) {
            this.logger.error(
              `[WALLET_CREATE] Failed after ${this.MAX_RETRIES} retries`,
              error.message
            );
            throw new ConflictException(
              'Hệ thống đang bận, vui lòng thử lại sau (mã lỗi: CONFLICT_RETRY)'
            );
          }

          // Small delay before retry
          await new Promise((resolve) => setTimeout(resolve, 100));
          continue;
        }

        // Re-throw other errors
        throw error;
      }
    }

    // =============================================================================
    // AUDIT LOG (outside transaction to avoid blocking)
    // =============================================================================
    try {
      await this.auditService.log({
        entity: 'Wallet',
        entityId: result.id,
        action: 'CREATE',
        beforeJson: null,
        afterJson: result as any,
        userId: userId || 'system',
        userEmail,
      });
    } catch (auditError) {
      // Audit failures should not break the main flow
      this.logger.error('[WALLET_CREATE] Audit log failed:', auditError.message);
    }

    return result;
  }

  async update(id: string, data: Prisma.WalletUpdateInput, userId?: string, userEmail?: string, userRole?: string) {
    if (userRole !== 'ADMIN') {
      throw new BadRequestException('Chỉ ADMIN được thực hiện thao tác này');
    }
    
    const existing = await this.findOne(id);
    const beforeJson = existing as any;
    
    // VisualType validation
    const visualType = (data.visualType as string) || existing.visualType;
    const iconKey = (data.iconKey as string | undefined) ?? existing.iconKey;
    const imageUrl = (data.imageUrl as string | undefined) ?? existing.imageUrl;
    
    if (visualType === 'ICON' && (!iconKey || iconKey.trim() === '')) {
      throw new BadRequestException('Icon là bắt buộc khi chọn loại Icon');
    }
    if (visualType === 'IMAGE' && (!imageUrl || imageUrl.trim() === '')) {
      throw new BadRequestException('Logo ảnh là bắt buộc khi chọn loại Logo');
    }

    const result = await this.prisma.wallet.update({
      where: { id },
      data: { ...data, visualType: visualType as any },
    });

    // Audit log for UPDATE
    await this.auditService.log({
      entity: 'Wallet',
      entityId: result.id,
      action: 'UPDATE',
      beforeJson,
      afterJson: result as any,
      userId: userId || 'system',
      userEmail,
    });

    return result;
  }

  async delete(id: string, userId?: string, userEmail?: string, userRole?: string) {
    if (userRole !== 'ADMIN') {
      throw new BadRequestException('Chỉ ADMIN được thực hiện thao tác này');
    }
    const existing = await this.findOne(id);
    const beforeJson = existing as any;

    // Check for related transactions before deletion
    const [transactionCount, transferCount] = await Promise.all([
      // Count transactions (income + expense) - excluding transfers
      this.prisma.transaction.count({
        where: {
          walletId: id,
          deletedAt: null,
          type: { in: ['INCOME', 'EXPENSE'] },
        },
      }),
      // Count transfers (where this wallet is fromWallet or toWallet)
      this.prisma.transaction.count({
        where: {
          deletedAt: null,
          type: 'TRANSFER',
          OR: [
            { walletId: id },
            { walletToId: id },
          ],
        },
      }),
    ]);

    if (transactionCount > 0 || transferCount > 0) {
      throw new ConflictException(
        'Không thể xóa ví vì đã có giao dịch liên quan. Vui lòng xóa các giao dịch trước.'
      );
    }

    const result = await this.prisma.wallet.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    // Audit log for DELETE (soft delete)
    await this.auditService.log({
      entity: 'Wallet',
      entityId: result.id,
      action: 'DELETE',
      beforeJson,
      afterJson: { ...result, deletedAt: result.deletedAt } as any,
      userId: userId || 'system',
      userEmail,
    });

    return result;
  }

  async restore(id: string, userId?: string, userEmail?: string, userRole?: string) {
    if (userRole !== 'ADMIN') {
      throw new BadRequestException('Chỉ ADMIN được thực hiện thao tác này');
    }
    const wallet = await this.prisma.wallet.findFirst({ where: { id } });
    if (!wallet) {
      throw new NotFoundException('Sổ quỹ không tồn tại');
    }

    const beforeJson = wallet as any;
    const result = await this.prisma.wallet.update({
      where: { id },
      data: { deletedAt: null, isActive: true },
    });

    // Audit log for RESTORE
    await this.auditService.log({
      entity: 'Wallet',
      entityId: result.id,
      action: 'RESTORE',
      beforeJson,
      afterJson: result as any,
      userId: userId || 'system',
      userEmail,
    });

    return result;
  }

  async getUsageSummary(walletId: string, from?: Date, to?: Date) {
    const startDate = from || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = to || new Date();

    // Calculate total income
    const incomeTotalResult = await this.prisma.transaction.aggregate({
      where: {
        walletId,
        type: 'INCOME',
        deletedAt: null, // AUDIT FIX: Exclude soft-deleted records
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });
    const incomeTotal = Number(incomeTotalResult._sum.amount || 0);

    // Calculate total expense
    const expenseTotalResult = await this.prisma.transaction.aggregate({
      where: {
        walletId,
        type: 'EXPENSE',
        deletedAt: null, // AUDIT FIX: Exclude soft-deleted records
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });
    const expenseTotal = Number(expenseTotalResult._sum.amount || 0);

    // Calculate adjustments total within the period
    const adjustmentsResult = await this.prisma.walletAdjustment.aggregate({
      where: {
        walletId,
        date: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      _sum: { amount: true },
    });
    const adjustmentsTotal = Number(adjustmentsResult._sum.amount || 0);

    // Net = income - expense + adjustments (includes opening balance)
    const net = incomeTotal - expenseTotal + adjustmentsTotal;

    // Income by category
    const incomeByCategory = await this.prisma.transaction.groupBy({
      by: ['incomeCategoryId'],
      where: {
        walletId,
        type: 'INCOME',
        deletedAt: null, // AUDIT FIX: Exclude soft-deleted records
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    const incomeCategoryIds = incomeByCategory
      .filter(i => i.incomeCategoryId !== null)
      .map(i => i.incomeCategoryId as string);
    const incomeCategories = await this.prisma.incomeCategory.findMany({
      where: { id: { in: incomeCategoryIds } },
    });

    // Expense by category
    const expenseByCategory = await this.prisma.transaction.groupBy({
      by: ['expenseCategoryId'],
      where: {
        walletId,
        type: 'EXPENSE',
        deletedAt: null, // AUDIT FIX: Exclude soft-deleted records
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    const expenseCategoryIds = expenseByCategory
      .filter(e => e.expenseCategoryId !== null)
      .map(e => e.expenseCategoryId as string);
    const expenseCategories = await this.prisma.expenseCategory.findMany({
      where: { id: { in: expenseCategoryIds } },
    });

    // Recent transactions (top 50 income/expense)
    const recentTransactions = await this.prisma.transaction.findMany({
      where: {
        walletId,
        type: { in: ['INCOME', 'EXPENSE'] },
        deletedAt: null,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'desc' },
      take: 50,
      include: { incomeCategory: true, expenseCategory: true, project: true },
    });

    return {
      walletId,
      period: { from: startDate, to: endDate },
      // KPI totals
      incomeTotal,
      expenseTotal,
      adjustmentsTotal,
      net,
      // Income by category with percent
      incomeByCategory: incomeByCategory
        .map(item => {
          const category = incomeCategories.find(c => c.id === item.incomeCategoryId);
          const totalAmount = Number(item._sum.amount || 0);
          return {
            id: item.incomeCategoryId,
            name: category?.name || 'Khác',
            totalAmount,
            percent: incomeTotal > 0 ? (totalAmount / incomeTotal) * 100 : 0,
            visualType: category?.visualType || 'ICON',
            iconKey: category?.iconKey || 'dollar-sign',
            imageUrl: category?.imageUrl,
            color: category?.color || '#10b981',
          };
        })
        .sort((a, b) => b.totalAmount - a.totalAmount),
      // Expense by category with percent
      expenseByCategory: expenseByCategory
        .map(item => {
          const category = expenseCategories.find(c => c.id === item.expenseCategoryId);
          const totalAmount = Number(item._sum.amount || 0);
          return {
            id: item.expenseCategoryId,
            name: category?.name || 'Khác',
            totalAmount,
            percent: expenseTotal > 0 ? (totalAmount / expenseTotal) * 100 : 0,
            visualType: category?.visualType || 'ICON',
            iconKey: category?.iconKey || 'shopping-cart',
            imageUrl: category?.imageUrl,
            color: category?.color || '#ef4444',
          };
        })
        .sort((a, b) => b.totalAmount - a.totalAmount),
      // Recent transactions
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        type: t.type,
        date: t.date,
        amount: t.amount,
        incomeCategoryName: t.incomeCategory?.name,
        expenseCategoryName: t.expenseCategory?.name,
        projectName: t.project?.name,
        projectId: t.projectId, // AUDIT FIX: Add projectId for drill-down
        note: t.note,
      })),
    };
  }

  async getAdjustments(walletId: string) {
    const adjustments = await this.prisma.walletAdjustment.findMany({
      where: {
        walletId,
        deletedAt: null,
      },
      orderBy: { date: 'desc' },
    });

    // Calculate running balance
    let balance = 0;
    const adjustmentsWithBalance = adjustments.map(adj => {
      balance += Number(adj.amount);
      return {
        ...adj,
        amount: Number(adj.amount),
        balanceAfter: balance,
      };
    });

    return adjustmentsWithBalance.reverse(); // Show oldest first for better readability
  }

  async getTransfers(walletId: string) {
    // Get transfers where this wallet is source or destination
    const transfers = await this.prisma.transaction.findMany({
      where: {
        OR: [
          { walletId },
          { walletToId: walletId },
        ],
        type: 'TRANSFER',
        deletedAt: null,
      },
      include: {
        wallet: true,
        walletTo: true,
      },
      orderBy: { date: 'desc' },
    });

    // Calculate running balance for this wallet
    let balance = 0;
    const transfersWithBalance = transfers.map(tx => {
      const isOutgoing = tx.walletId === walletId;
      const amount = Number(tx.amount);
      
      if (isOutgoing) {
        balance -= amount;
      } else {
        balance += amount;
      }

      return {
        id: tx.id,
        date: tx.date,
        amount: amount,
        isOutgoing,
        counterpartyWallet: isOutgoing ? tx.walletTo : tx.wallet,
        counterpartyWalletName: isOutgoing ? tx.walletTo?.name : tx.wallet?.name,
        note: tx.note,
        balanceAfter: balance,
      };
    });

    return transfersWithBalance.reverse(); // Show oldest first
  }
}
