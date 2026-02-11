import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // Helper to get date range filter
  private getDateFilter(from?: string, to?: string): { gte?: Date; lte?: Date } {
    if (!from && !to) return {};
    const startDate = from ? new Date(from) : new Date('1970-01-01');
    const endDate = to ? new Date(to) : new Date();
    endDate.setHours(23, 59, 59, 999);
    return { gte: startDate, lte: endDate };
  }

  async getIncomeSummary(params: {
    from?: string;
    to?: string;
    walletId?: string;
    projectId?: string;
  }) {
    const { from, to, walletId, projectId } = params;
    const dateFilter = this.getDateFilter(from, to);

    // Build transaction filter
    const txWhere: Prisma.TransactionWhereInput = {
      type: 'INCOME',
      deletedAt: null,
      date: dateFilter,
      ...(walletId ? { walletId } : {}),
      ...(projectId ? { projectId } : {}),
    };

    // Get total income
    const transactions = await this.prisma.transaction.findMany({
      where: txWhere,
      include: { incomeCategory: true },
    });

    const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

    // Aggregate by category
    const categoryMap = new Map<string, { name: string; iconKey: string | null; color: string | null; amount: number }>();
    
    for (const tx of transactions) {
      const catId = tx.incomeCategoryId || 'unknown';
      const existing = categoryMap.get(catId);
      const amount = Number(tx.amount);
      
      if (existing) {
        existing.amount += amount;
      } else {
        categoryMap.set(catId, {
          name: tx.incomeCategory?.name || 'Khác',
          iconKey: tx.incomeCategory?.iconKey || null,
          color: tx.incomeCategory?.color || null,
          amount,
        });
      }
    }

    // Sort by amount descending and add percent
    const byCategory = Array.from(categoryMap.values())
      .sort((a, b) => b.amount - a.amount)
      .map((item, _, arr) => ({
        incomeCategoryId: item.name,
        name: item.name,
        iconKey: item.iconKey,
        color: item.color,
        totalAmount: item.amount,
        percent: total > 0 ? Math.round((item.amount / total) * 100) : 0,
      }));

    // Get daily series using Prisma aggregation
    const dailyData = await this.prisma.transaction.groupBy({
      by: ['date'],
      where: {
        type: 'INCOME',
        deletedAt: null,
        date: dateFilter,
        ...(walletId ? { walletId } : {}),
        ...(projectId ? { projectId } : {}),
      },
      _sum: { amount: true },
      orderBy: { date: 'asc' },
    });

    const series = dailyData.map(d => ({
      date: new Date(d.date).toISOString().split('T')[0],
      amount: Number(d._sum.amount || 0),
    }));

    return { total, byCategory, series };
  }

  async getExpenseSummary(params: {
    from?: string;
    to?: string;
    walletId?: string;
    projectId?: string;
    isCommonCost?: boolean;
  }) {
    const { from, to, walletId, projectId, isCommonCost } = params;
    const dateFilter = this.getDateFilter(from, to);

    // Build transaction filter
    const txWhere: Prisma.TransactionWhereInput = {
      type: 'EXPENSE',
      deletedAt: null,
      date: dateFilter,
      ...(walletId ? { walletId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(isCommonCost !== undefined ? { isCommonCost } : {}),
    };

    // Get total expenses
    const transactions = await this.prisma.transaction.findMany({
      where: txWhere,
      include: { expenseCategory: true },
    });

    const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const directTotal = transactions
      .filter(t => !t.isCommonCost)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const commonTotal = transactions
      .filter(t => t.isCommonCost)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Aggregate by category
    const categoryMap = new Map<string, { name: string; iconKey: string | null; color: string | null; amount: number }>();
    
    for (const tx of transactions) {
      const catId = tx.expenseCategoryId || 'unknown';
      const existing = categoryMap.get(catId);
      const amount = Number(tx.amount);
      
      if (existing) {
        existing.amount += amount;
      } else {
        categoryMap.set(catId, {
          name: tx.expenseCategory?.name || 'Khác',
          iconKey: tx.expenseCategory?.iconKey || null,
          color: tx.expenseCategory?.color || null,
          amount,
        });
      }
    }

    // Sort by amount descending and add percent
    const byCategory = Array.from(categoryMap.values())
      .sort((a, b) => b.amount - a.amount)
      .map((item, _, arr) => ({
        expenseCategoryId: item.name,
        name: item.name,
        iconKey: item.iconKey,
        color: item.color,
        totalAmount: item.amount,
        percent: total > 0 ? Math.round((item.amount / total) * 100) : 0,
      }));

    // Get daily series using Prisma aggregation
    const dailyData = await this.prisma.transaction.groupBy({
      by: ['date'],
      where: {
        type: 'EXPENSE',
        deletedAt: null,
        date: dateFilter,
        ...(walletId ? { walletId } : {}),
        ...(projectId ? { projectId } : {}),
        ...(isCommonCost !== undefined ? { isCommonCost } : {}),
      },
      _sum: { amount: true },
      orderBy: { date: 'asc' },
    });

    const series = dailyData.map(d => ({
      date: new Date(d.date).toISOString().split('T')[0],
      amount: Number(d._sum.amount || 0),
    }));

    return { total, directTotal, commonTotal, byCategory, series };
  }

  async getCustomerRegionsReport(params: {
    from?: string;
    to?: string;
    stage?: string;
  }) {
    const { from, to, stage } = params;
    const dateFilter = this.getDateFilter(from, to);

    // Get all customers grouped by region
    const customersByRegion = await this.prisma.customer.groupBy({
      by: ['region'],
      where: {
        deletedAt: null,
        region: { not: null },
      },
      _count: { id: true },
    });

    // Get projects with customers and transactions
    const projectFilter: Prisma.ProjectWhereInput = {
      deletedAt: null,
      ...(stage ? { stage } : {}),
    };

    const projects = await this.prisma.project.findMany({
      where: projectFilter,
      include: {
        customer: true,
        transactions: {
          where: {
            deletedAt: null,
            date: dateFilter,
          },
        },
      },
    });

    // Aggregate by region
    const regionStats = new Map<string, {
      customerCount: number;
      orderCount: number;
      revenueTotal: number;
      expenseTotal: number;
    }>();

    // Initialize with customer counts
    for (const c of customersByRegion) {
      if (c.region) {
        regionStats.set(c.region, {
          customerCount: c._count.id,
          orderCount: 0,
          revenueTotal: 0,
          expenseTotal: 0,
        });
      }
    }

    // Calculate project metrics by region
    for (const project of projects) {
      const region = project.customer?.region || 'Chưa xác định';
      const stats = regionStats.get(region) || {
        customerCount: 0,
        orderCount: 0,
        revenueTotal: 0,
        expenseTotal: 0,
      };

      stats.orderCount++;

      for (const tx of project.transactions) {
        const amount = Number(tx.amount);
        if (tx.type === 'INCOME') {
          stats.revenueTotal += amount;
        } else if (tx.type === 'EXPENSE' && !tx.isCommonCost) {
          stats.expenseTotal += amount;
        }
      }

      regionStats.set(region, stats);
    }

    // Convert to array
    const byRegion = Array.from(regionStats.entries())
      .map(([region, stats]) => ({
        region,
        ...stats,
        profitL1: stats.revenueTotal - stats.expenseTotal,
      }))
      .sort((a, b) => b.revenueTotal - a.revenueTotal);

    // Get top regions
    const topRegionsByCustomers = Array.from(regionStats.entries())
      .sort((a, b) => b[1].customerCount - a[1].customerCount)
      .slice(0, 5)
      .map(([region, stats]) => ({ region, customerCount: stats.customerCount }));

    const topRegionsByRevenue = byRegion
      .slice(0, 5)
      .map(({ region, revenueTotal }) => ({ region, revenueTotal }));

    return { byRegion, topRegionsByCustomers, topRegionsByRevenue };
  }

  async getSalesChannelsReport(params: {
    from?: string;
    to?: string;
    stage?: string;
  }) {
    const { from, to, stage } = params;
    const dateFilter = this.getDateFilter(from, to);

    // Get all customers grouped by sourceChannel
    const customersByChannel = await this.prisma.customer.groupBy({
      by: ['sourceChannel'],
      where: {
        deletedAt: null,
        sourceChannel: { not: null },
      },
      _count: { id: true },
    });

    // Get projects with customers and transactions
    const projectFilter: Prisma.ProjectWhereInput = {
      deletedAt: null,
      ...(stage ? { stage } : {}),
    };

    const projects = await this.prisma.project.findMany({
      where: projectFilter,
      include: {
        customer: true,
        transactions: {
          where: {
            deletedAt: null,
            date: dateFilter,
          },
        },
      },
    });

    // Aggregate by channel
    const channelStats = new Map<string, {
      customerCount: number;
      orderCount: number;
      revenueTotal: number;
      expenseTotal: number;
    }>();

    // Initialize with customer counts
    for (const c of customersByChannel) {
      if (c.sourceChannel) {
        channelStats.set(c.sourceChannel, {
          customerCount: c._count.id,
          orderCount: 0,
          revenueTotal: 0,
          expenseTotal: 0,
        });
      }
    }

    // Calculate project metrics by channel
    for (const project of projects) {
      const channel = project.customer?.sourceChannel || 'OTHER';
      const stats = channelStats.get(channel) || {
        customerCount: 0,
        orderCount: 0,
        revenueTotal: 0,
        expenseTotal: 0,
      };

      stats.orderCount++;

      for (const tx of project.transactions) {
        const amount = Number(tx.amount);
        if (tx.type === 'INCOME') {
          stats.revenueTotal += amount;
        } else if (tx.type === 'EXPENSE' && !tx.isCommonCost) {
          stats.expenseTotal += amount;
        }
      }

      channelStats.set(channel, stats);
    }

    // Convert to array
    const byChannel = Array.from(channelStats.entries())
      .map(([sourceChannel, stats]) => ({
        sourceChannel,
        ...stats,
        profitL1: stats.revenueTotal - stats.expenseTotal,
      }))
      .sort((a, b) => b.revenueTotal - a.revenueTotal);

    // Get top channels
    const topChannelsByRevenue = byChannel
      .slice(0, 5)
      .map(({ sourceChannel, revenueTotal }) => ({ sourceChannel, revenueTotal }));

    const topChannelsByCustomers = Array.from(channelStats.entries())
      .sort((a, b) => b[1].customerCount - a[1].customerCount)
      .slice(0, 5)
      .map(([sourceChannel, stats]) => ({ sourceChannel, customerCount: stats.customerCount }));

    return { byChannel, topChannelsByRevenue, topChannelsByCustomers };
  }
}

