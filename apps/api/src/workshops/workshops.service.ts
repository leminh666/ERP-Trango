import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class WorkshopsService {
  private readonly logger = new Logger(WorkshopsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(params?: { search?: string; includeDeleted?: boolean }) {
    const where: Prisma.WorkshopWhereInput = {
      ...(params?.includeDeleted ? {} : { deletedAt: null, isActive: true }),
    };

    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.workshop.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const workshop = await this.prisma.workshop.findFirst({
      where: { id, deletedAt: null },
    });

    if (!workshop) {
      throw new NotFoundException(`Xưởng không tồn tại`);
    }

    return workshop;
  }

  async findRelated(id: string, from?: string, to?: string) {
    const dateFilter: Prisma.TransactionWhereInput = {};
    
    if (from || to) {
      dateFilter.date = {};
      if (from) dateFilter.date.gte = new Date(from);
      if (to) dateFilter.date.lte = new Date(to);
    }

    // Get orders (projects) directly related to this workshop
    const orders = await this.prisma.project.findMany({
      where: {
        workshopId: id,
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
        name: true,
        stage: true,
        status: true,
        deadline: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    // Get order IDs
    const orderIds = orders.map(o => o.id);

    // Get workshop jobs directly related to this workshop
    const workshopJobs = await this.prisma.workshopJob.findMany({
      where: {
        workshopId: id,
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
        title: true,
        amount: true,
        paidAmount: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        project: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    // Get transactions directly related to this workshop
    const transactions = await this.prisma.transaction.findMany({
      where: {
        workshopId: id,
        deletedAt: null,
        ...dateFilter,
      },
      select: {
        id: true,
        code: true,
        type: true,
        date: true,
        amount: true,
        note: true,
        incomeCategory: { select: { name: true } },
        expenseCategory: { select: { name: true } },
        wallet: { select: { name: true } },
        project: { select: { id: true, code: true, name: true } },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });

    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      orders: orders.map(o => ({
        id: o.id,
        code: o.code,
        name: o.name,
        stage: o.stage,
        status: o.status,
        deadline: o.deadline,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      })),
      workshopJobs: workshopJobs.map(wj => ({
        id: wj.id,
        code: wj.code,
        title: wj.title,
        amount: Number(wj.amount),
        paidAmount: Number(wj.paidAmount),
        debtAmount: Number(wj.amount) - Number(wj.paidAmount),
        status: wj.status,
        orderId: wj.project?.id,
        orderCode: wj.project?.code,
        orderName: wj.project?.name,
        createdAt: wj.createdAt,
        updatedAt: wj.updatedAt,
      })),
      incomes: transactions
        .filter(t => t.type === 'INCOME')
        .map(t => ({
          id: t.id,
          code: t.code,
          amount: Number(t.amount),
          date: t.date,
          categoryName: t.incomeCategory?.name || null,
          note: t.note,
          walletName: t.wallet?.name || null,
          orderId: t.project?.id || null,
          orderCode: t.project?.code || null,
        })),
      expenses: transactions
        .filter(t => t.type === 'EXPENSE')
        .map(t => ({
          id: t.id,
          code: t.code,
          amount: Number(t.amount),
          date: t.date,
          categoryName: t.expenseCategory?.name || null,
          note: t.note,
          walletName: t.wallet?.name || null,
          orderId: t.project?.id || null,
          orderCode: t.project?.code || null,
        })),
      summary: {
        orderCount: orders.length,
        workshopJobCount: workshopJobs.length,
        transactionCount: transactions.length,
        totalIncome,
        totalExpense,
        net: totalIncome - totalExpense,
      },
    };
  }

  async create(data: Prisma.WorkshopCreateInput, userId?: string, userEmail?: string) {
    const lastWorkshop = await this.prisma.workshop.findFirst({
      orderBy: { code: 'desc' },
    });

    const lastCode = lastWorkshop ? parseInt(lastWorkshop.code.replace('X', '')) : 0;
    const newCode = `X${String(lastCode + 1).padStart(3, '0')}`;

    const result = await this.prisma.workshop.create({
      data: { ...data, code: newCode },
    });

    // Audit log for CREATE
    await this.auditService.log({
      entity: 'Workshop',
      entityId: result.id,
      action: 'CREATE',
      beforeJson: null,
      afterJson: result as any,
      userId: userId || 'system',
      userEmail,
    });

    return result;
  }

  async update(id: string, data: Prisma.WorkshopUpdateInput, userId?: string, userEmail?: string) {
    const existing = await this.findOne(id);
    const beforeJson = existing as any;

    const result = await this.prisma.workshop.update({
      where: { id },
      data,
    });

    // Audit log for UPDATE
    await this.auditService.log({
      entity: 'Workshop',
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

    const result = await this.prisma.workshop.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    // Audit log for DELETE
    await this.auditService.log({
      entity: 'Workshop',
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
    const workshop = await this.prisma.workshop.findFirst({
      where: { id },
    });

    if (!workshop) {
      throw new NotFoundException(`Xưởng không tồn tại`);
    }

    const beforeJson = workshop as any;
    const result = await this.prisma.workshop.update({
      where: { id },
      data: { deletedAt: null, isActive: true },
    });

    // Audit log for RESTORE
    await this.auditService.log({
      entity: 'Workshop',
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
