import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(params: {
    search?: string;
    status?: string;
    region?: string;
    ownerUserId?: string;
    hasNextFollowUp?: boolean;
    overdueFollowUp?: boolean;
    includeDeleted?: boolean;
  }) {
    const { search, status, region, ownerUserId, hasNextFollowUp, overdueFollowUp, includeDeleted } = params;

    const where: Prisma.CustomerWhereInput = {
      ...(includeDeleted ? {} : { deletedAt: null, isActive: true }),
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status as any;
    }

    if (region) {
      where.region = region;
    }

    if (ownerUserId) {
      where.ownerUserId = ownerUserId;
    }

    if (hasNextFollowUp === true) {
      where.nextFollowUpAt = { not: null };
    }

    if (overdueFollowUp === true) {
      where.nextFollowUpAt = { lt: new Date() };
    }

    const customers = await this.prisma.customer.findMany({
      where,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { followUps: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return customers;
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        followUps: {
          orderBy: { scheduledAt: 'desc' },
          include: {
            createdBy: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Khách hàng không tồn tại`);
    }

    return customer;
  }

  async findRelated(id: string, from?: string, to?: string) {
    const dateFilter: Prisma.TransactionWhereInput = {};
    
    if (from || to) {
      dateFilter.date = {};
      if (from) dateFilter.date.gte = new Date(from);
      if (to) dateFilter.date.lte = new Date(to);
    }

    // Get orders (projects) directly related to this customer
    const orders = await this.prisma.project.findMany({
      where: {
        customerId: id,
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

    // Get order IDs for indirect relationships
    const orderIds = orders.map(o => o.id);

    // Get workshop jobs indirectly related via orders
    const workshopJobs = await this.prisma.workshopJob.findMany({
      where: {
        projectId: { in: orderIds },
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

    // Get transactions directly related via project
    const transactions = await this.prisma.transaction.findMany({
      where: {
        projectId: { in: orderIds },
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

  async create(data: Prisma.CustomerCreateInput, userId?: string, userEmail?: string) {
    try {
      // Auto-generate code
      const lastCustomer = await this.prisma.customer.findFirst({
        orderBy: { code: 'desc' },
      });

      const lastCode = lastCustomer ? parseInt(lastCustomer.code.replace('KH', '')) : 0;
      const newCode = `KH${String(lastCode + 1).padStart(4, '0')}`;


      console.log('data', data);

      const result = await this.prisma.customer.create({
        data: {
          ...data,
          code: newCode,
        },
      });

      // Audit log for CREATE
      await this.auditService.log({
        entity: 'Customer',
        entityId: result.id,
        action: 'CREATE',
        beforeJson: null,
        afterJson: result as any,
        userId: userId || 'system',
        userEmail,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to create customer:', error);

      // Handle Prisma known errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2002: Unique constraint violation
        if (error.code === 'P2002') {
          const target = (error.meta?.target as string[]) || [];
          if (target.includes('phone')) {
            throw new BadRequestException('Số điện thoại đã tồn tại trong hệ thống');
          }
          if (target.includes('code')) {
            throw new BadRequestException('Mã khách hàng đã tồn tại');
          }
          throw new BadRequestException('Dữ liệu đã tồn tại trong hệ thống');
        }

        // P2000: Value out of range
        if (error.code === 'P2000') {
          throw new BadRequestException('Giá trị không hợp lệ, vui lòng kiểm tra lại');
        }

        // P2003: Foreign key constraint failed
        if (error.code === 'P2003') {
          throw new BadRequestException('Dữ liệu tham chiếu không hợp lệ');
        }
      }

      // Re-throw for other errors
      throw error;
    }
  }

  async update(id: string, data: Prisma.CustomerUpdateInput, userId?: string, userEmail?: string) {
    const existing = await this.findOne(id);
    const beforeJson = existing as any;

    const result = await this.prisma.customer.update({
      where: { id },
      data,
    });

    // Audit log for UPDATE
    await this.auditService.log({
      entity: 'Customer',
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

    const result = await this.prisma.customer.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    // Audit log for DELETE
    await this.auditService.log({
      entity: 'Customer',
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
    const customer = await this.prisma.customer.findFirst({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException(`Khách hàng không tồn tại`);
    }

    const beforeJson = customer as any;
    const result = await this.prisma.customer.update({
      where: { id },
      data: {
        deletedAt: null,
        isActive: true,
      },
    });

    // Audit log for RESTORE
    await this.auditService.log({
      entity: 'Customer',
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
