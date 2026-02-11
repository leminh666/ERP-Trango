import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardData(from: string, to: string) {
    const startDate = new Date(from);
    const endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999);

    // 1. Get revenue and expense totals
    const transactions = await this.prisma.transaction.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        deletedAt: null,
      },
      include: {
        incomeCategory: true,
        expenseCategory: true,
      },
    });

    const revenueTotal = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenseTotal = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const profit = revenueTotal - expenseTotal;

    // Build daily series from grouped data
    const dailyMap = new Map<string, { revenue: number; expense: number }>();
    
    // Initialize with all transactions (need to process each one)
    const allDailyTransactions = await this.prisma.transaction.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        deletedAt: null,
      },
      select: {
        date: true,
        type: true,
        amount: true,
      },
    });

    for (const t of allDailyTransactions) {
      const dateKey = t.date.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || { revenue: 0, expense: 0 };
      if (t.type === 'INCOME') {
        existing.revenue += Number(t.amount);
      } else if (t.type === 'EXPENSE') {
        existing.expense += Number(t.amount);
      }
      dailyMap.set(dateKey, existing);
    }

    const dailyData = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 3. Get AR (Accounts Receivable) - Customer debts
    const arTop = await this.prisma.customer.findMany({
      where: {
        status: { notIn: ['WON', 'LOST'] },
        deletedAt: null,
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        _count: {
          select: { followUps: true },
        },
      },
    });

    // 4. Get AP (Accounts Payable) - Workshop debts
    const apWorkshopTop = await this.prisma.workshop.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        note: true,
      },
    });

    // 5. Get AP - Supplier debts
    const apSupplierTop = await this.prisma.supplier.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        note: true,
      },
    });

    return {
      revenueTotal,
      expenseTotal,
      profit,
      series: dailyData.map(d => ({
        date: d.date,
        revenue: d.revenue,
        expense: d.expense,
      })),
      arTop: arTop.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        status: c.status,
        followUpCount: c._count.followUps,
      })),
      apWorkshopTop: apWorkshopTop.map(w => ({
        id: w.id,
        name: w.name,
        phone: w.phone,
        note: w.note,
      })),
      apSupplierTop: apSupplierTop.map(s => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        note: s.note,
      })),
    };
  }
}

