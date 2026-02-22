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
    // Debt = (rawTotal - discountAmount) - paidAmount (INCOME transactions)
    // rawTotal uses acceptance-aware qty×price (same as getSummary in projects.service.ts)
    const customers = await this.prisma.customer.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, phone: true },
    });

    let customerDebtTotal = 0;
    const customerDebts: { id: string; name: string; phone: string | null; debt: number }[] = [];

    for (const customer of customers) {
      // Get all projects with orderItems + acceptanceItems
      const projects = await this.prisma.project.findMany({
        where: { customerId: customer.id, deletedAt: null },
        include: {
          orderItems: {
            where: { deletedAt: null },
            include: { acceptanceItems: true },
          },
        },
      });

      // Acceptance-aware total, subtract discount per project
      const totalAmount = projects.reduce((sum, project) => {
        const rawTotal = project.orderItems.reduce((itemSum, item) => {
          const acceptance = item.acceptanceItems?.[0];
          const effectiveQty = acceptance?.acceptedQty != null
            ? Number(acceptance.acceptedQty)
            : Number(item.qty || 0);
          const effectivePrice = acceptance?.unitPrice != null
            ? Number(acceptance.unitPrice)
            : Number(item.unitPrice || 0);
          return itemSum + effectiveQty * effectivePrice;
        }, 0);
        return sum + rawTotal - Number(project.discountAmount || 0);
      }, 0);

      // Get all income transactions (payments received from customer)
      const incomeTransactions = await this.prisma.transaction.findMany({
        where: {
          project: { customerId: customer.id },
          type: 'INCOME',
          deletedAt: null,
        },
        select: { amount: true },
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
    // NOTE: The Supplier model has no invoice/purchase-order table.
    // Transaction.supplierId records payments already MADE to suppliers (EXPENSE = paid out).
    // There is no "amount owed to supplier" source in the schema.
    // Công nợ NCC = Tổng INCOME từ NCC (hoàn tiền) - Tổng EXPENSE cho NCC (đã chi)
    // If EXPENSE > INCOME → supplier owes us nothing, we owe them (but no invoice to compare) → 0
    // If INCOME > EXPENSE → supplier owes us money → show as debt
    const suppliers = await this.prisma.supplier.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, phone: true, note: true },
    });

    let supplierDebtTotal = 0;
    const supplierDebts: { id: string; name: string; phone: string | null; note: string | null; debt: number }[] = [];

    for (const supplier of suppliers) {
      const [expenseTxs, incomeTxs] = await Promise.all([
        this.prisma.transaction.findMany({
          where: { supplierId: supplier.id, type: 'EXPENSE', deletedAt: null },
          select: { amount: true },
        }),
        this.prisma.transaction.findMany({
          where: { supplierId: supplier.id, type: 'INCOME', deletedAt: null },
          select: { amount: true },
        }),
      ]);

      const totalExpense = expenseTxs.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      const totalIncome = incomeTxs.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

      // Supplier owes us if we received more income from them than we paid out
      // (e.g. refunds > payments). Otherwise 0 — no invoice tracking available.
      const debtAmount = Math.max(0, totalIncome - totalExpense);
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
        select: { id: true, amount: true, discountAmount: true, paidAmount: true },
      });

      // Debt = (amount - discountAmount) - paidAmount per job
      const debtAmount = workshopJobs.reduce((sum, wj) => {
        const net = Math.max(0, Number(wj.amount || 0) - Number(wj.discountAmount || 0));
        return sum + Math.max(0, net - Number(wj.paidAmount || 0));
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

