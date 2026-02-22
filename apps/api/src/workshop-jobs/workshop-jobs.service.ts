import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, WorkshopJobStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { TransactionsService } from '../transactions/transactions.service';

export interface WorkshopJobListParams {
  from?: Date;
  to?: Date;
  search?: string;
  status?: WorkshopJobStatus | 'ALL';
  workshopId?: string;
  projectId?: string;
  includeDeleted?: boolean;
}

export interface WorkshopJobItemInput {
  productId?: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

export interface WorkshopJobCreateDto {
  projectId: string;
  workshopId: string;
  title?: string;
  description?: string;
  amount?: number; // Optional - will be calculated from items if provided
  discountAmount?: number; // Chiết khấu cho phiếu gia công
  items?: WorkshopJobItemInput[];
  status?: WorkshopJobStatus;
  startDate?: Date | null;
  dueDate?: Date | null;
  note?: string;
}

export interface WorkshopJobUpdateDto extends Partial<Omit<WorkshopJobCreateDto, 'projectId' | 'workshopId'>> {}

export interface WorkshopJobPayDto {
  date: Date;
  amount: number;
  walletId: string;
  expenseCategoryId: string;
  note?: string;
}

@Injectable()
export class WorkshopJobsService {
  private readonly logger = new Logger(WorkshopJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly transactionsService: TransactionsService,
  ) {}

  /**
   * Compute workshop debt: sum of (netAmount - paidAmount) for all jobs in a workshop
   * netAmount = amount - discountAmount
   * paidAmount = sum of EXPENSE transactions linked to workshopJobId
   *
   * @param workshopId - Workshop ID
   * @returns debt amount (>= 0)
   */
  private async computeWorkshopDebt(workshopId: string): Promise<number> {
    const workshopJobs = await this.prisma.workshopJob.findMany({
      where: { workshopId, deletedAt: null },
      select: { id: true, amount: true, discountAmount: true },
    });

    let totalDebt = 0;

    for (const wj of workshopJobs) {
      const rawAmount = Number(wj.amount || 0);
      const discountAmount = Number(wj.discountAmount || 0);
      const netAmount = rawAmount - discountAmount;

      // Get paid amount from EXPENSE transactions linked to this job
      const paidTransactions = await this.prisma.transaction.findMany({
        where: {
          workshopJobId: wj.id,
          type: 'EXPENSE',
          deletedAt: null,
        },
        select: { amount: true },
      });

      const paidAmount = paidTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      const jobDebt = Math.max(0, netAmount - paidAmount);
      totalDebt += jobDebt;
    }

    return totalDebt;
  }

  /**
   * Get all workshop debts (for dashboard)
   * Returns only workshops with debt > 0
   */
  async getWorkshopDebts(): Promise<Array<{ id: string; name: string; phone: string | null; note: string | null; debt: number }>> {
    const workshops = await this.prisma.workshop.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, phone: true, note: true },
    });

    const debts: Array<{ id: string; name: string; phone: string | null; note: string | null; debt: number }> = [];

    for (const workshop of workshops) {
      const debt = await this.computeWorkshopDebt(workshop.id);
      if (debt > 0) {
        debts.push({
          id: workshop.id,
          name: workshop.name,
          phone: workshop.phone,
          note: workshop.note,
          debt,
        });
      }
    }

    // Sort by debt descending
    debts.sort((a, b) => b.debt - a.debt);
    return debts;
  }

    const SEQUENCE_KEY = 'WORKSHOP_JOB';

    // Atomic increment using upsert
    const seq = await this.prisma.codeSequence.upsert({
      where: { key: SEQUENCE_KEY },
      create: { key: SEQUENCE_KEY, value: 1 },
      update: { value: { increment: 1 } },
    });

    const number = seq.value;
    return `JG${String(number).padStart(4, '0')}`;
  }

  async findAll(params: WorkshopJobListParams) {
    const { from, to, search, status, workshopId, projectId, includeDeleted } = params;

    // Helper to convert Date or string to ISO date string (YYYY-MM-DD)
    const toDateString = (value: Date | string | undefined): string | undefined => {
      if (!value) return undefined;
      if (typeof value === 'string') return value.split('T')[0]; // Already a date string
      return value.toISOString().split('T')[0]; // Convert Date to YYYY-MM-DD
    };

    const fromStr = toDateString(from);
    const toStr = toDateString(to);

    const where: Prisma.WorkshopJobWhereInput = {
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(workshopId ? { workshopId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(
        status && status !== 'ALL'
          ? { status }
          : {}
      ),
      // Filter by startDate (ngày bắt đầu làm việc) instead of createdAt
      // Fix: Use proper date string to avoid Invalid Date from Date+string concatenation
      ...(fromStr && toStr
        ? {
            startDate: {
              gte: new Date(fromStr + 'T00:00:00.000Z'),
              lte: new Date(toStr + 'T23:59:59.999Z'),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { title: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const jobs = await this.prisma.workshopJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        project: true,
        workshop: true,
        items: true,
      },
    });

    if (jobs.length === 0) {
      return [];
    }

    const jobIds = jobs.map((j) => j.id);

    const paymentGroups = await this.prisma.transaction.groupBy({
      by: ['workshopJobId'],
      where: {
        workshopJobId: { in: jobIds },
        deletedAt: null,
        type: 'EXPENSE',
      },
      _sum: {
        amount: true,
      },
    });

    const paidMap = new Map<string, number>();
    for (const g of paymentGroups) {
      if (!g.workshopJobId) continue;
      paidMap.set(g.workshopJobId, Number(g._sum.amount || 0));
    }

    return jobs.map((job) => {
      const paidAmount = paidMap.get(job.id) || 0;
      const rawAmount = Number(job.amount || 0);
      const discountAmount = Number(job.discountAmount || 0);
      const netAmount = rawAmount - discountAmount; // Tổng tiền SAU chiết khấu
      const debtAmount = Math.max(0, netAmount - paidAmount);

      return {
        ...job,
        rawAmount,
        discountAmount,
        netAmount,
        paidAmount,
        debtAmount,
      };
    });
  }

  async summary(params: WorkshopJobListParams) {
    const { from, to, status, workshopId, projectId } = params;

    // Helper to convert Date or string to ISO date string (YYYY-MM-DD)
    const toDateString = (value: Date | string | undefined): string | undefined => {
      if (!value) return undefined;
      if (typeof value === 'string') return value.split('T')[0]; // Already a date string
      return value.toISOString().split('T')[0]; // Convert Date to YYYY-MM-DD
    };

    const fromStr = toDateString(from);
    const toStr = toDateString(to);

    const where: Prisma.WorkshopJobWhereInput = {
      deletedAt: null,
      ...(workshopId ? { workshopId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(
        status && status !== 'ALL'
          ? { status }
          : {}
      ),
      // Filter by startDate (ngày bắt đầu làm việc) instead of createdAt
      // Fix: Use proper date string to avoid Invalid Date from Date+string concatenation
      ...(fromStr && toStr
        ? {
            startDate: {
              gte: new Date(fromStr + 'T00:00:00.000Z'),
              lte: new Date(toStr + 'T23:59:59.999Z'),
            },
          }
        : {}),
    };

    const jobs = await this.prisma.workshopJob.findMany({
      where,
      select: { id: true, amount: true, discountAmount: true },
    });

    if (jobs.length === 0) {
      return {
        totalJobAmount: 0,
        totalPaidAmount: 0,
        totalDebtAmount: 0,
      };
    }

    const jobIds = jobs.map((j) => j.id);
    // totalJobAmount = SUM(amount - discountAmount) — tổng tiền SAU chiết khấu
    const totalJobAmount = jobs.reduce(
      (sum, j) => sum + Math.max(0, Number(j.amount || 0) - Number(j.discountAmount || 0)),
      0,
    );

    const paymentGroups = await this.prisma.transaction.groupBy({
      by: ['workshopJobId'],
      where: {
        workshopJobId: { in: jobIds },
        deletedAt: null,
        type: 'EXPENSE',
      },
      _sum: {
        amount: true,
      },
    });

    const totalPaidAmount = paymentGroups.reduce(
      (sum, g) => sum + Number(g._sum.amount || 0),
      0,
    );

    return {
      totalJobAmount,
      totalPaidAmount,
      totalDebtAmount: totalJobAmount - totalPaidAmount,
    };
  }

  async findOne(id: string) {
    const job = await this.prisma.workshopJob.findFirst({
      where: { id },
      include: {
        project: true,
        workshop: true,
        items: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Phiếu gia công không tồn tại');
    }

    return job;
  }

  async getPayments(id: string) {
    const job = await this.findOne(id);

    const payments = await this.prisma.transaction.findMany({
      where: {
        workshopJobId: id,
        type: 'EXPENSE',
        deletedAt: null,
      },
      orderBy: { date: 'desc' },
      include: {
        wallet: true,
        expenseCategory: true,
      },
    });

    const paidAmount = payments.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    const rawAmount = Number(job.amount || 0);
    const discountAmount = Number(job.discountAmount || 0);
    const netAmount = rawAmount - discountAmount; // Tổng tiền SAU chiết khấu
    const debtAmount = Math.max(0, netAmount - paidAmount);

    return {
      job,
      rawAmount,
      discountAmount,
      netAmount,
      paidAmount,
      debtAmount,
      payments: payments.map((tx) => ({
        txId: tx.id,
        voucherId: tx.id, // Include expense voucher ID for frontend to link/edit
        date: tx.date,
        amount: Number(tx.amount || 0),
        walletName: tx.wallet?.name || '',
        expenseCategoryName: tx.expenseCategory?.name || '',
        note: tx.note,
      })),
    };
  }

  async create(data: WorkshopJobCreateDto, userId?: string, userEmail?: string) {
    if (!data.projectId || !data.workshopId) {
      throw new BadRequestException('Phiếu gia công bắt buộc chọn Đơn hàng và Xưởng gia công');
    }

    // Use transaction for atomic code generation and data integrity
    const result = await this.prisma.$transaction(async (tx) => {
      // Generate unique code atomically
      const code = await this.getNextWorkshopJobCode();

      // Calculate total from items if provided
      let totalAmount = 0;
      if (data.items && data.items.length > 0) {
        totalAmount = data.items.reduce((sum, item) => {
          const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
          return sum + lineTotal;
        }, 0);
      }

      // If amount not provided or less than calculated total, use calculated total
      const finalAmount = data.items && data.items.length > 0 ? totalAmount : (data.amount || 0);
      
      // Allow totalAmount = 0 (e.g., when quantity not yet confirmed)
      if (finalAmount < 0) {
        throw new BadRequestException('Tổng tiền gia công không được âm');
      }

      // Create workshop job
      const job = await tx.workshopJob.create({
        data: {
          code,
          project: { connect: { id: data.projectId } },
          workshop: { connect: { id: data.workshopId } },
          title: data.title,
          description: data.description,
          amount: new Prisma.Decimal(finalAmount),
          status: data.status || WorkshopJobStatus.DRAFT,
          startDate: data.startDate || new Date(), // Default to current date if not provided
          dueDate: data.dueDate || null,
          note: data.note,
          createdByUserId: userId,
        },
        include: {
          project: true,
          workshop: true,
        },
      });

      // Create items if provided
      if (data.items && data.items.length > 0) {
        const itemsData = data.items.map((item) => ({
          workshopJobId: job.id,
          productId: item.productId || null,
          productName: item.productName,
          unit: item.unit,
          quantity: new Prisma.Decimal(item.quantity || 0),
          unitPrice: new Prisma.Decimal(item.unitPrice || 0),
          lineTotal: new Prisma.Decimal((item.quantity || 0) * (item.unitPrice || 0)),
        }));

        await tx.workshopJobItem.createMany({
          data: itemsData,
        });
      }

      return job;
    });

    // Fetch the created job with items for response
    const fullResult = await this.findOne(result.id);

    await this.auditService.log({
      entity: 'WorkshopJob',
      entityId: fullResult.id,
      action: 'CREATE',
      beforeJson: null,
      afterJson: fullResult as any,
      userId: userId || 'system',
      userEmail,
    });

    return fullResult;
  }

  async update(id: string, data: WorkshopJobUpdateDto, userId?: string, userEmail?: string) {
    const existing = await this.findOne(id);
    const beforeJson = existing as any;

    // Use transaction for updating items
    const result = await this.prisma.$transaction(async (tx) => {
      // Calculate total from items if provided
      let totalAmount = 0;
      if (data.items && data.items.length > 0) {
        totalAmount = data.items.reduce((sum, item) => {
          const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
          return sum + lineTotal;
        }, 0);
      }

      const finalAmount = data.items && data.items.length > 0 ? totalAmount : (data.amount !== undefined ? data.amount : Number(existing.amount));

      // Allow totalAmount = 0 (e.g., when quantity not yet confirmed)
      if (finalAmount < 0) {
        throw new BadRequestException('Tổng tiền gia công không được âm');
      }

      // Validate discount amount
      const discountAmount = data.discountAmount !== undefined ? data.discountAmount : Number(existing.discountAmount);
      if (discountAmount < 0) {
        throw new BadRequestException('Chiết khấu không được âm');
      }
      if (discountAmount > finalAmount) {
        throw new BadRequestException('Chiết khấu không được lớn hơn tổng tiền');
      }

      // Update workshop job
      const job = await tx.workshopJob.update({
        where: { id },
        data: {
          title: data.title ?? existing.title,
          description: data.description ?? existing.description,
          amount: new Prisma.Decimal(finalAmount),
          discountAmount: new Prisma.Decimal(discountAmount),
          status: (data.status as any) ?? existing.status,
          startDate: data.startDate !== undefined ? data.startDate : existing.startDate,
          dueDate: data.dueDate !== undefined ? data.dueDate : existing.dueDate,
          note: data.note !== undefined ? data.note : existing.note,
          updatedByUserId: userId,
        },
        include: {
          project: true,
          workshop: true,
        },
      });

      // Update items if provided
      if (data.items !== undefined) {
        // Delete existing items
        await tx.workshopJobItem.deleteMany({
          where: { workshopJobId: id },
        });

        // Create new items
        if (data.items.length > 0) {
          const itemsData = data.items.map((item) => ({
            workshopJobId: id,
            productId: item.productId || null,
            productName: item.productName,
            unit: item.unit,
            quantity: new Prisma.Decimal(item.quantity || 0),
            unitPrice: new Prisma.Decimal(item.unitPrice || 0),
            lineTotal: new Prisma.Decimal((item.quantity || 0) * (item.unitPrice || 0)),
          }));

          await tx.workshopJobItem.createMany({
            data: itemsData,
          });
        }
      }

      return job;
    });

    // Fetch the updated job with items for response
    const fullResult = await this.findOne(result.id);

    await this.auditService.log({
      entity: 'WorkshopJob',
      entityId: fullResult.id,
      action: 'UPDATE',
      beforeJson,
      afterJson: fullResult as any,
      userId: userId || 'system',
      userEmail,
    });

    return fullResult;
  }

  async delete(id: string, userId?: string, userEmail?: string) {
    const existing = await this.findOne(id);
    const beforeJson = existing as any;

    const result = await this.prisma.workshopJob.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: {
        project: true,
        workshop: true,
      },
    });

    await this.auditService.log({
      entity: 'WorkshopJob',
      entityId: result.id,
      action: 'DELETE',
      beforeJson,
      afterJson: { ...result, deletedAt: result.deletedAt } as any,
      userId: userId || 'system',
      userEmail,
    });

    return result;
  }

  // === Workshop Job Items CRUD ===
  async updateItem(
    jobId: string,
    itemId: string,
    data: { quantity?: number; unitPrice?: number; productName?: string; unit?: string; note?: string },
    userId?: string,
    userEmail?: string,
  ) {
    // Verify job exists
    const job = await this.findOne(jobId);
    const existingItem = job.items?.find(i => i.id === itemId);
    
    if (!existingItem) {
      throw new NotFoundException('Hạng mục không tồn tại');
    }

    const beforeJson = existingItem as any;

    // Calculate line total
    const quantity = data.quantity !== undefined ? data.quantity : Number(existingItem.quantity);
    const unitPrice = data.unitPrice !== undefined ? data.unitPrice : Number(existingItem.unitPrice);
    const lineTotal = quantity * unitPrice;

    const updatedItem = await this.prisma.workshopJobItem.update({
      where: { id: itemId },
      data: {
        quantity: new Prisma.Decimal(quantity),
        unitPrice: new Prisma.Decimal(unitPrice),
        lineTotal: new Prisma.Decimal(lineTotal),
        productName: data.productName ?? existingItem.productName,
        unit: data.unit ?? existingItem.unit,
      },
    });

    // Update job total
    await this.recalculateJobTotal(jobId);

    await this.auditService.log({
      entity: 'WorkshopJobItem',
      entityId: updatedItem.id,
      action: 'UPDATE',
      beforeJson,
      afterJson: updatedItem as any,
      userId: userId || 'system',
      userEmail,
    });

    return updatedItem;
  }

  async deleteItem(jobId: string, itemId: string, userId?: string, userEmail?: string) {
    // Verify job exists
    const job = await this.findOne(jobId);
    const existingItem = job.items?.find(i => i.id === itemId);
    
    if (!existingItem) {
      throw new NotFoundException('Hạng mục không tồn tại');
    }

    const beforeJson = existingItem as any;

    await this.prisma.workshopJobItem.delete({
      where: { id: itemId },
    });

    // Update job total
    await this.recalculateJobTotal(jobId);

    await this.auditService.log({
      entity: 'WorkshopJobItem',
      entityId: itemId,
      action: 'DELETE',
      beforeJson,
      afterJson: { id: itemId, deleted: true } as any,
      userId: userId || 'system',
      userEmail,
    });

    return { success: true, id: itemId };
  }

  async updateItems(
    jobId: string,
    items: Array<{ id: string; quantity: number; unitPrice?: number }>,
    userId?: string,
    userEmail?: string,
  ) {
    // Verify job exists
    const job = await this.findOne(jobId);
    const beforeJson = job as any;

    // Update each item
    for (const item of items) {
      const existingItem = job.items?.find(i => i.id === item.id);
      if (existingItem) {
        const quantity = item.quantity;
        const unitPrice = item.unitPrice !== undefined ? item.unitPrice : Number(existingItem.unitPrice);
        const lineTotal = quantity * unitPrice;

        await this.prisma.workshopJobItem.update({
          where: { id: item.id },
          data: {
            quantity: new Prisma.Decimal(quantity),
            unitPrice: new Prisma.Decimal(unitPrice),
            lineTotal: new Prisma.Decimal(lineTotal),
          },
        });
      }
    }

    // Update job total
    await this.recalculateJobTotal(jobId);

    // Fetch updated job
    const fullResult = await this.findOne(jobId);

    await this.auditService.log({
      entity: 'WorkshopJob',
      entityId: jobId,
      action: 'UPDATE',
      beforeJson,
      afterJson: fullResult as any,
      userId: userId || 'system',
      userEmail,
    });

    return fullResult;
  }

  private async recalculateJobTotal(jobId: string) {
    const items = await this.prisma.workshopJobItem.findMany({
      where: { workshopJobId: jobId },
    });

    const totalAmount = items.reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.unitPrice || 0);
    }, 0);

    await this.prisma.workshopJob.update({
      where: { id: jobId },
      data: { amount: new Prisma.Decimal(totalAmount) },
    });
  }

  async restore(id: string, userId?: string, userEmail?: string) {
    const existing = await this.prisma.workshopJob.findFirst({
      where: { id },
      include: {
        project: true,
        workshop: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Phiếu gia công không tồn tại');
    }

    const beforeJson = existing as any;

    const result = await this.prisma.workshopJob.update({
      where: { id },
      data: { deletedAt: null },
      include: {
        project: true,
        workshop: true,
      },
    });

    await this.auditService.log({
      entity: 'WorkshopJob',
      entityId: result.id,
      action: 'RESTORE',
      beforeJson,
      afterJson: result as any,
      userId: userId || 'system',
      userEmail,
    });

    return result;
  }

  async pay(id: string, payload: WorkshopJobPayDto, userId: string, userEmail?: string) {
    const job = await this.findOne(id);

    if (!payload.amount || payload.amount <= 0) {
      throw new BadRequestException('Số tiền thanh toán phải > 0');
    }

    const paymentsInfo = await this.getPayments(id);
    const currentDebt = paymentsInfo.debtAmount;

    if (payload.amount > currentDebt) {
      throw new BadRequestException('Số tiền thanh toán không được lớn hơn công nợ còn lại');
    }

    const notePrefix = `Thanh toán gia công - ${job.code}`;
    const note =
      payload.note && payload.note.trim().length > 0
        ? `${notePrefix} - ${payload.note}`
        : notePrefix;

    const tx = await this.transactionsService.create(
      {
        type: 'EXPENSE' as any,
        date: payload.date,
        amount: new Prisma.Decimal(payload.amount),
        note,
        wallet: { connect: { id: payload.walletId } },
        expenseCategory: { connect: { id: payload.expenseCategoryId } },
        project: { connect: { id: job.projectId } },
        workshopId: job.workshopId,
        workshopJob: { connect: { id: job.id } } as any,
        isCommonCost: false,
      } as any,
      userId,
      userEmail,
    );

    return tx;
  }

  async updatePayment(
    jobId: string,
    expenseId: string,
    data: { amount?: number; walletId?: string; expenseCategoryId?: string; date?: string; note?: string },
    userId?: string,
    userEmail?: string,
  ) {
    // Verify expense belongs to this job
    const expense = await this.prisma.transaction.findFirst({
      where: { id: expenseId, workshopJobId: jobId },
    });

    if (!expense) {
      throw new BadRequestException('Phiếu chi không tồn tại hoặc không thuộc phiếu gia công này');
    }

    const beforeJson = expense as any;

    // Update expense
    const updated = await this.prisma.transaction.update({
      where: { id: expenseId },
      data: {
        ...(data.amount !== undefined && { amount: new Prisma.Decimal(data.amount) }),
        ...(data.walletId && { wallet: { connect: { id: data.walletId } } }),
        ...(data.expenseCategoryId && { expenseCategory: { connect: { id: data.expenseCategoryId } } }),
        ...(data.date && { date: new Date(data.date) }),
        ...(data.note !== undefined && { note: data.note }),
        updatedAt: new Date(),
      },
    });

    await this.auditService.log({
      entity: 'Transaction',
      entityId: updated.id,
      action: 'UPDATE',
      beforeJson,
      afterJson: updated as any,
      userId: userId || 'system',
      userEmail,
    });

    return updated;
  }

  async deletePayment(
    jobId: string,
    expenseId: string,
    userId?: string,
    userEmail?: string,
  ) {
    // Verify expense belongs to this job
    const expense = await this.prisma.transaction.findFirst({
      where: { id: expenseId, workshopJobId: jobId },
    });

    if (!expense) {
      throw new BadRequestException('Phiếu chi không tồn tại hoặc không thuộc phiếu gia công này');
    }

    const beforeJson = expense as any;

    // Soft delete
    const deleted = await this.prisma.transaction.update({
      where: { id: expenseId },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await this.auditService.log({
      entity: 'Transaction',
      entityId: deleted.id,
      action: 'DELETE',
      beforeJson,
      afterJson: deleted as any,
      userId: userId || 'system',
      userEmail,
    });

    return { ok: true, id: deleted.id };
  }
}
