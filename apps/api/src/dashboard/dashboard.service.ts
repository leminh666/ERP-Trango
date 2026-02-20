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

    // ========== Calculate Ads Expense by Platform ==========
    const adsExpenses = await this.prisma.transaction.groupBy({
      by: ['adsPlatform'],
      where: {
        type: 'EXPENSE',
        isAds: true,
        deletedAt: null,
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    const adsByPlatform = adsExpenses
      .filter(a => a.adsPlatform)
      .map(a => ({
        platform: a.adsPlatform,
        amount: Number(a._sum.amount || 0),
      }));

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

    // ========== Calculate Customer Debts ==========
    // Debt = totalAmount (from projects) - paidAmount (from transactions)
    const customers = await this.prisma.customer.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, phone: true },
    });

    let customerDebtTotal = 0;
    const customerDebts: { id: string; name: string; phone: string | null; debt: number }[] = [];

    for (const customer of customers) {
      // Get all projects for this customer
      const projects = await this.prisma.project.findMany({
        where: { customerId: customer.id, deletedAt: null },
        include: { orderItems: true },
      });

      const totalAmount = projects.reduce((sum, project) => {
        const projectTotal = project.orderItems.reduce((itemSum, item) => {
          return itemSum + Number(item.amount || 0);
        }, 0);
        return sum + projectTotal;
      }, 0);

      // Get all income transactions (payments)
      const incomeTransactions = await this.prisma.transaction.findMany({
        where: {
          project: { customerId: customer.id },
          type: 'INCOME',
          deletedAt: null,
        },
      });
      const paidAmount = incomeTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const debtAmount = Math.max(0, totalAmount - paidAmount);
      if (debtAmount > 0) {
        customerDebts.push({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          debt: debtAmount,
        });
        customerDebtTotal += debtAmount;
      }
    }

    // Sort by debt descending, take top 5
    customerDebts.sort((a, b) => b.debt - a.debt);
    const customerDebtsTop = customerDebts.slice(0, 5);

    // ========== Calculate Supplier Debts ==========
    // Debt = sum of expense transactions linked to each supplier
    const suppliers = await this.prisma.supplier.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, phone: true, note: true },
    });

    let supplierDebtTotal = 0;
    const supplierDebts: { id: string; name: string; phone: string | null; note: string | null; debt: number }[] = [];

    for (const supplier of suppliers) {
      // Get all EXPENSE transactions for this supplier
      const supplierTransactions = await this.prisma.transaction.findMany({
        where: { supplierId: supplier.id, type: 'EXPENSE', deletedAt: null },
        select: { id: true, amount: true },
      });

      const debtAmount = supplierTransactions.reduce((sum, tx) => {
        return sum + Number(tx.amount || 0);
      }, 0);

      if (debtAmount > 0) {
        supplierDebts.push({
          id: supplier.id,
          name: supplier.name,
          phone: supplier.phone,
          note: supplier.note,
          debt: debtAmount,
        });
        supplierDebtTotal += debtAmount;
      }
    }

    // Sort by debt descending, take top 5
    supplierDebts.sort((a, b) => b.debt - a.debt);
    const supplierDebtsTop = supplierDebts.slice(0, 5);

    // ========== Calculate Workshop Debts ==========
    // Debt = sum of (amount - paidAmount) for all workshop jobs for this workshop
    const workshops = await this.prisma.workshop.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, phone: true, note: true },
    });

    let workshopDebtTotal = 0;
    const workshopDebts: { id: string; name: string; phone: string | null; note: string | null; debt: number }[] = [];

    for (const workshop of workshops) {
      const workshopJobs = await this.prisma.workshopJob.findMany({
        where: { workshopId: workshop.id, deletedAt: null },
        select: { id: true, amount: true, paidAmount: true },
      });

      const debtAmount = workshopJobs.reduce((sum, wj) => {
        return sum + Math.max(0, Number(wj.amount || 0) - Number(wj.paidAmount || 0));
      }, 0);

      if (debtAmount > 0) {
        workshopDebts.push({
          id: workshop.id,
          name: workshop.name,
          phone: workshop.phone,
          note: workshop.note,
          debt: debtAmount,
        });
        workshopDebtTotal += debtAmount;
      }
    }

    // Sort by debt descending, take top 5
    workshopDebts.sort((a, b) => b.debt - a.debt);
    const workshopDebtsTop = workshopDebts.slice(0, 5);

    // 3. Get AR (Accounts Receivable) - from CRM Customers (legacy - for compatibility)
    const arTop = await this.prisma.crmCustomer.findMany({
      where: {
        stage: { notIn: ['CONTRACT_SIGNED', 'CANCELLED'] },
        customer: {
          deletedAt: null,
          isActive: true,
        },
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
            _count: {
              select: { followUps: true },
            },
          },
        },
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
      // Ads expense by platform
      adsByPlatform,
      // Debt data for new dashboard
      customerDebtTotal,
      customerDebts: customerDebtsTop,
      supplierDebtTotal,
      supplierDebts: supplierDebtsTop,
      workshopDebtTotal,
      workshopDebts: workshopDebtsTop,
      // Legacy data for backward compatibility
      arTop: arTop.map(c => ({
        id: c.customer.id,
        crmId: c.id,
        name: c.customer.name,
        phone: c.customer.phone,
        stage: c.stage,
        legacyCustomerId: c.legacyCustomerId,
        // Keep status for backward compatibility with frontend
        status: c.stage, 
        followUpCount: c.customer._count.followUps,
      })),
      apWorkshopTop: workshopDebtsTop.map(w => ({
        id: w.id,
        name: w.name,
        phone: w.phone,
        note: w.note,
      })),
      apSupplierTop: supplierDebtsTop.map(s => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        note: s.note,
      })),
    };
  }
}

