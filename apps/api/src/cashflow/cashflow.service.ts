import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface WalletResult {
  walletId: string;
  walletName: string;
  walletType: string;
  incomeTotal: number;
  expenseTotal: number;
  transferInTotal: number;
  transferOutTotal: number;
  adjustmentTotal: number;
  netChange: number;
}

@Injectable()
export class CashflowService {
  private readonly logger = new Logger(CashflowService.name);

  constructor(private prisma: PrismaService) {}

  async getCashflowReport(params: {
    from?: string;
    to?: string;
    walletId?: string;
  }) {
    const { from, to, walletId } = params;

    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    // Get all active wallets
    const walletWhere: any = { deletedAt: null, isActive: true };
    if (walletId) walletWhere.id = walletId;

    const wallets = await this.prisma.wallet.findMany({
      where: walletWhere,
      orderBy: { name: 'asc' },
    });

    const walletResults: WalletResult[] = [];

    for (const wallet of wallets) {
      // Income transactions
      const incomeTxs = await this.prisma.transaction.aggregate({
        where: {
          walletId: wallet.id,
          type: 'INCOME',
          deletedAt: null,
          date: dateFilter,
        },
        _sum: { amount: true },
      });

      // Expense transactions
      const expenseTxs = await this.prisma.transaction.aggregate({
        where: {
          walletId: wallet.id,
          type: 'EXPENSE',
          deletedAt: null,
          date: dateFilter,
        },
        _sum: { amount: true },
      });

      // Transfer in (money coming TO this wallet)
      const transferInTxs = await this.prisma.transaction.aggregate({
        where: {
          walletToId: wallet.id,
          type: 'TRANSFER',
          deletedAt: null,
          date: dateFilter,
        },
        _sum: { amount: true },
      });

      // Transfer out (money going FROM this wallet)
      const transferOutTxs = await this.prisma.transaction.aggregate({
        where: {
          walletId: wallet.id,
          type: 'TRANSFER',
          deletedAt: null,
          date: dateFilter,
        },
        _sum: { amount: true },
      });

      // Adjustments
      const adjustments = await this.prisma.walletAdjustment.aggregate({
        where: {
          walletId: wallet.id,
          deletedAt: null,
          date: dateFilter,
        },
        _sum: { amount: true },
      });

      const incomeTotal = Number(incomeTxs._sum.amount || 0);
      const expenseTotal = Number(expenseTxs._sum.amount || 0);
      const transferInTotal = Number(transferInTxs._sum.amount || 0);
      const transferOutTotal = Number(transferOutTxs._sum.amount || 0);
      const adjustmentTotal = Number(adjustments._sum.amount || 0);

      // Calculate net change
      const netChange = incomeTotal + transferInTotal + (adjustmentTotal > 0 ? adjustmentTotal : 0)
                        - expenseTotal - transferOutTotal - (adjustmentTotal < 0 ? Math.abs(adjustmentTotal) : 0);

      walletResults.push({
        walletId: wallet.id,
        walletName: wallet.name,
        walletType: wallet.type,
        incomeTotal,
        expenseTotal,
        transferInTotal,
        transferOutTotal,
        adjustmentTotal,
        netChange,
      });
    }

    // Calculate totals
    const totals = {
      incomeTotal: walletResults.reduce((sum, w) => sum + w.incomeTotal, 0),
      expenseTotal: walletResults.reduce((sum, w) => sum + w.expenseTotal, 0),
      transferInTotal: walletResults.reduce((sum, w) => sum + w.transferInTotal, 0),
      transferOutTotal: walletResults.reduce((sum, w) => sum + w.transferOutTotal, 0),
      adjustmentTotal: walletResults.reduce((sum, w) => sum + w.adjustmentTotal, 0),
      netChange: walletResults.reduce((sum, w) => sum + w.netChange, 0),
    };

    // Calculate series (daily breakdown)
    const series = await this.getDailySeries(from, to, walletId);

    return {
      byWallet: walletResults,
      totals,
      series,
    };
  }

  private async getDailySeries(from?: string, to?: string, walletId?: string) {
    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) {
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.lte = endDate;
    }

    const walletFilter = walletId ? { walletId } : {};

    // Get all transactions grouped by date using Prisma
    const txs = await this.prisma.transaction.findMany({
      where: {
        deletedAt: null,
        type: { in: ['INCOME', 'EXPENSE', 'TRANSFER'] },
        date: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        ...(walletId ? {
          OR: [
            { walletId },
            { walletToId: walletId }
          ]
        } : {}),
      },
      select: {
        date: true,
        type: true,
        amount: true,
        walletToId: true,
      },
      orderBy: { date: 'asc' },
    });

    // Group by date
    const seriesMap = new Map<string, { inTotal: number; outTotal: number; net: number }>();

    for (const tx of txs) {
      const dateKey = tx.date.toISOString().split('T')[0];
      const amount = Number(tx.amount);

      if (!seriesMap.has(dateKey)) {
        seriesMap.set(dateKey, { inTotal: 0, outTotal: 0, net: 0 });
      }

      const entry = seriesMap.get(dateKey)!;

      if (tx.type === 'INCOME') {
        entry.inTotal += amount;
        entry.net += amount;
      } else if (tx.type === 'EXPENSE') {
        entry.outTotal += amount;
        entry.net -= amount;
      } else if (tx.type === 'TRANSFER') {
        // For transfers, if walletId is specified, we need to know direction
        if (walletId) {
          if (tx.walletToId === walletId) {
            // Money coming in
            entry.inTotal += amount;
            entry.net += amount;
          } else {
            // Money going out
            entry.outTotal += amount;
            entry.net -= amount;
          }
        } else {
          // No wallet filter - show as outgoing (simplified)
          entry.outTotal += amount;
          entry.net -= amount;
        }
      }
    }

    // Add adjustments
    const adjustments = await this.prisma.walletAdjustment.findMany({
      where: {
        deletedAt: null,
        date: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        ...(walletId ? { walletId } : {}),
      },
      select: {
        date: true,
        amount: true,
      },
    });

    for (const adj of adjustments) {
      const dateKey = adj.date.toISOString().split('T')[0];
      const amount = Number(adj.amount);

      if (!seriesMap.has(dateKey)) {
        seriesMap.set(dateKey, { inTotal: 0, outTotal: 0, net: 0 });
      }

      const entry = seriesMap.get(dateKey)!;
      if (amount > 0) {
        entry.inTotal += amount;
        entry.net += amount;
      } else {
        entry.outTotal += Math.abs(amount);
        entry.net -= Math.abs(amount);
      }
    }

    // Convert to array and sort
    const series = Array.from(seriesMap.entries())
      .map(([date, data]) => ({
        date,
        inTotal: data.inTotal,
        outTotal: data.outTotal,
        net: data.net,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return series;
  }
}

