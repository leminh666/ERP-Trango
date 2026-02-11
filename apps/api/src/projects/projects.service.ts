import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ProjectsService {
  private readonly pipelineStages = [
    'Lead',
    'Báo giá',
    'Hẹn khảo sát',
    'Ký HĐ',
    'Thiết kế 3D',
    'Sản xuất xưởng',
    'Thi công',
    'Nghiệm thu',
    'Bảo hành',
  ];

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(data: { name: string; customerId: string; address?: string; note?: string; deadline?: string }, userId: string, userEmail: string) {
    // Generate project code
    const count = await this.prisma.project.count();
    const code = `DH${String(count + 1).padStart(5, '0')}`;

    const project = await this.prisma.project.create({
      data: {
        code,
        name: data.name,
        customerId: data.customerId,
        address: data.address || null,
        note: data.note || null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        stage: 'LEAD',
        status: 'ACTIVE',
      },
      include: {
        customer: true,
      },
    });

    // Audit log
    await this.audit.log({
      action: 'CREATE',
      entity: 'Project',
      entityId: project.id,
      userId,
      userEmail,
      beforeJson: null,
      afterJson: project,
    });

    return project;
  }

  async findAll(params: { search?: string; includeDeleted?: boolean; stage?: string; customerId?: string }) {
    const { search, includeDeleted, stage, customerId } = params;

    const where: Prisma.ProjectWhereInput = {
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(stage ? { stage } : {}),
      ...(customerId ? { customerId } : {}),
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        workshop: true,
      },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        workshop: true,
      },
    });

    if (!project) {
      throw new Error('Dự án không tồn tại');
    }

    return project;
  }

  private assertValidStage(stage: string) {
    if (!stage || !this.pipelineStages.includes(stage)) {
      throw new BadRequestException('Stage không hợp lệ');
    }
  }

  async getKanban(params: { from?: string; to?: string; search?: string; customerId?: string }) {
    const { from, to, search, customerId } = params;

    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      ...(customerId ? { customerId } : {}),
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (from || to) {
      const startDate = from ? new Date(from) : new Date('1970-01-01');
      const endDate = to ? new Date(to) : new Date();
      endDate.setHours(23, 59, 59, 999);
      where.updatedAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const projects = await this.prisma.project.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        customer: true,
        orderItems: { where: { deletedAt: null } },
        transactions: { where: { deletedAt: null } },
      },
    });

    const projectIds = projects.map((p) => p.id);

    // === getKanbanData ===
    // Fetch workshop jobs for all projects
    const workshopJobs = await this.prisma.workshopJob.findMany({
      where: {
        projectId: { in: projectIds },
        deletedAt: null,
      },
      select: {
        projectId: true,
        amount: true,
        discountAmount: true,
      },
    });

    // Build project -> workshop job total map (after discount)
    const workshopJobTotalByProject = new Map<string, number>();
    for (const job of workshopJobs) {
      const jobAmount = Number(job.amount || 0);
      const discountAmount = Number(job.discountAmount || 0);
      const netAmount = Math.max(0, jobAmount - discountAmount); // Ensure non-negative
      const current = workshopJobTotalByProject.get(job.projectId) || 0;
      workshopJobTotalByProject.set(job.projectId, current + netAmount);
    }

    const grouped: Record<string, any[]> = {};
    for (const stage of this.pipelineStages) grouped[stage] = [];

    for (const p of projects) {
      const stage = this.pipelineStages.includes(p.stage) ? p.stage : 'Lead';
      if (!grouped[stage]) grouped[stage] = [];

      const incomeTotal = p.transactions
        .filter((t: any) => t.type === 'INCOME')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      // Calculate expense = (WorkshopJob total - discount) + Project expense transactions
      // Exclude: common costs + transactions with workshopJobId (workshop payments)
      const workshopJobAmount = workshopJobTotalByProject.get(p.id) || 0;
      const expenseTransactions = p.transactions
        .filter((t: any) => 
          t.type === 'EXPENSE' && 
          !t.isCommonCost &&
          !t.workshopJobId // Exclude workshop job payments (chi gia cong)
        );
      const expenseTotal = workshopJobAmount +
        expenseTransactions
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      const profitL1 = incomeTotal - expenseTotal;
      const estimatedTotal = p.orderItems.reduce((sum: number, item: any) => sum + Number(item.amount), 0);

      grouped[stage].push({
        projectId: p.id,
        code: p.code,
        name: p.name,
        stage: stage,
        customerId: p.customer?.id ?? null,
        customerName: p.customer?.name ?? null,
        estimatedTotal,
        incomeTotal,
        workshopJobAmount,
        expenseTotal,
        profitL1,
        updatedAt: p.updatedAt,
      });
    }

    return {
      stages: this.pipelineStages,
      grouped,
    };
  }

  async updateStage(
    id: string,
    body: { stage: string },
    userId?: string,
    userEmail?: string,
    req?: any,
  ) {
    this.assertValidStage(body?.stage);

    const before = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, stage: true, updatedAt: true },
    });

    if (!before) {
      throw new BadRequestException('Dự án không tồn tại');
    }

    if (before.stage === body.stage) {
      return { ok: true, stage: before.stage };
    }

    const after = await this.prisma.project.update({
      where: { id },
      data: {
        stage: body.stage,
        updatedAt: new Date(),
      },
      select: { id: true, stage: true, updatedAt: true },
    });

    if (userId) {
      await this.audit.logWithReq(
        {
          entity: 'Project',
          entityId: id,
          action: 'STAGE_CHANGE',
          beforeJson: before as any,
          afterJson: after as any,
          userId,
          userEmail,
        },
        req,
      );
    }

    return { ok: true, stage: after.stage, updatedAt: after.updatedAt };
  }

  async update(
    id: string,
    data: { name?: string; customerId?: string; address?: string; note?: string; deadline?: string },
    userId?: string,
    userEmail?: string,
  ) {
    const before = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
    });

    if (!before) {
      throw new BadRequestException('Dự án không tồn tại');
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.customerId && { customerId: data.customerId }),
        ...(data.address !== undefined && { address: data.address || null }),
        ...(data.note !== undefined && { note: data.note || null }),
        ...(data.deadline !== undefined && { deadline: data.deadline ? new Date(data.deadline) : null }),
      },
      include: {
        customer: true,
        workshop: true,
      },
    });

    if (userId) {
      await this.audit.log({
        action: 'UPDATE',
        entity: 'Project',
        entityId: id,
        userId,
        userEmail,
        beforeJson: before,
        afterJson: updated,
      });
    }

    return updated;
  }

  async updateDiscount(
    id: string,
    discountAmount: number,
    userId?: string,
    userEmail?: string,
  ) {
    // Validate discount amount
    if (discountAmount < 0) {
      throw new BadRequestException('Chiết khấu không được âm');
    }

    const before = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
    });

    if (!before) {
      throw new BadRequestException('Dự án không tồn tại');
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        discountAmount: new Prisma.Decimal(discountAmount),
      },
      include: {
        customer: true,
        workshop: true,
      },
    });

    if (userId) {
      await this.audit.log({
        action: 'UPDATE_DISCOUNT',
        entity: 'Project',
        entityId: id,
        userId,
        userEmail,
        beforeJson: { ...before, discountAmount: before.discountAmount },
        afterJson: { ...updated, discountAmount: discountAmount },
      });
    }

    return updated;
  }

  async delete(id: string, userId?: string, userEmail?: string) {
    const before = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
    });

    if (!before) {
      throw new BadRequestException('Dự án không tồn tại hoặc đã bị xóa');
    }

    const deleted = await this.prisma.project.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    if (userId) {
      await this.audit.log({
        action: 'DELETE',
        entity: 'Project',
        entityId: id,
        userId,
        userEmail,
        beforeJson: before,
        afterJson: deleted,
      });
    }

    return { ok: true, id: deleted.id, deletedAt: deleted.deletedAt };
  }

  async getSummary(params: {
    from?: string;
    to?: string;
    stage?: string;
    customerId?: string;
    search?: string;
    includeDeleted?: boolean;
  }) {
    const { from, to, stage, customerId, search, includeDeleted } = params;

    // Base filter for projects
    const projectWhere: Prisma.ProjectWhereInput = {
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(stage ? { stage } : {}),
      ...(customerId ? { customerId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Get all projects with relations
    const projects = await this.prisma.project.findMany({
      where: projectWhere,
      include: {
        customer: true,
        workshop: true,
        orderItems: {
          where: { deletedAt: null },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Date range filter for transactions
    let dateFilter: Prisma.TransactionWhereInput = {
      deletedAt: null,
    };

    if (from || to) {
      const startDate = from ? new Date(from) : new Date('1970-01-01');
      const endDate = to ? new Date(to) : new Date();
      endDate.setHours(23, 59, 59, 999);
      dateFilter.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Get all transactions for these projects
    const projectIds = projects.map((p) => p.id);
    const transactions = await this.prisma.transaction.findMany({
      where: {
        ...dateFilter,
        projectId: { in: projectIds },
      },
      include: {
        incomeCategory: true,
      },
    });

    // Get income categories with codes
    const incomeCategories = await this.prisma.incomeCategory.findMany({
      where: { isActive: true },
    });

    const categoryCodeMap = new Map<string, string>();
    incomeCategories.forEach((cat) => {
      categoryCodeMap.set(cat.id, cat.code);
    });

    // Fetch workshop jobs for all projects
    const workshopJobs = await this.prisma.workshopJob.findMany({
      where: {
        projectId: { in: projectIds },
        deletedAt: null,
      },
      select: {
        projectId: true,
        amount: true,
        discountAmount: true,
      },
    });

    // Build project -> workshop job total map (after discount)
    const workshopJobTotalByProject = new Map<string, number>();
    for (const job of workshopJobs) {
      const jobAmount = Number(job.amount || 0);
      const discountAmount = Number(job.discountAmount || 0);
      const netAmount = Math.max(0, jobAmount - discountAmount); // Ensure non-negative
      const current = workshopJobTotalByProject.get(job.projectId) || 0;
      workshopJobTotalByProject.set(job.projectId, current + netAmount);
    }

    const classifyIncome = (incomeCategoryId: string | null, note: string | null): 'DEPOSIT' | 'PAYMENT' | 'FINAL' => {
      if (!incomeCategoryId) {
        // Fallback based on note
        const noteLower = (note || '').toLowerCase();
        if (noteLower.includes('đặt cọc') || noteLower.includes('cọc')) return 'DEPOSIT';
        if (noteLower.includes('tất toán') || noteLower.includes('quyết toán')) return 'FINAL';
        return 'PAYMENT';
      }

      const code = categoryCodeMap.get(incomeCategoryId);
      if (code === 'DEPOSIT') return 'DEPOSIT';
      if (code === 'PAYMENT') return 'PAYMENT';
      if (code === 'FINAL') return 'FINAL';

      // Fallback based on category name
      const category = incomeCategories.find((c) => c.id === incomeCategoryId);
      const nameLower = (category?.name || '').toLowerCase();
      if (nameLower.includes('đặt cọc') || nameLower.includes('cọc')) return 'DEPOSIT';
      if (nameLower.includes('tất toán') || nameLower.includes('quyết toán')) return 'FINAL';
      return 'PAYMENT';
    };

    // Build result for each project
    const result = projects.map((project) => {
      // Filter transactions for this project
      const projectTransactions = transactions.filter((t) => t.projectId === project.id);

      // Calculate financials
      let incomeDeposit = 0;
      let incomePayment = 0;
      let incomeFinal = 0;
      let incomeTotal = 0;

      // Calculate income by category
      projectTransactions
        .filter((t) => t.type === 'INCOME')
        .forEach((t) => {
          const category = classifyIncome(t.incomeCategoryId, t.note);
          const amount = Number(t.amount);

          if (category === 'DEPOSIT') incomeDeposit += amount;
          else if (category === 'FINAL') incomeFinal += amount;
          else incomePayment += amount;

          incomeTotal += amount;
        });

      // Calculate expense = (WorkshopJob total - discount) + Project expense transactions
      // Excludes: common costs, internal transfers, workshop job payments
      const workshopJobAmount = workshopJobTotalByProject.get(project.id) || 0;
      let expenseTotal = workshopJobAmount;

      // Add direct project expenses (excluding common costs, internal transfers, and workshop payments)
      projectTransactions
        .filter((t) => 
          t.type === 'EXPENSE' && 
          !t.isCommonCost &&
          !t.workshopJobId // Exclude workshop job payments (chi tra xuong)
        )
        .forEach((t) => {
          expenseTotal += Number(t.amount);
        });

      // Calculate estimated total from order items
      const estimatedTotal = project.orderItems.reduce((sum, item) => sum + Number(item.amount), 0);

      // Calculate profit
      const profitL1 = incomeTotal - expenseTotal;

      return {
        projectId: project.id,
        code: project.code,
        name: project.name,
        customerName: project.customer?.name || null,
        workshopName: project.workshop?.name || null,
        stage: project.stage,
        status: project.status,
        estimatedTotal,
        incomeDeposit,
        incomePayment,
        incomeFinal,
        incomeTotal,
        workshopJobAmount, // Tổng tiền gia công (đã tính vào expenseTotal)
        expenseTotal,      // expenseTotal = workshopJobAmount + chi phí công trình
        profitL1,
      };
    });

    return result;
  }

  // === Order Acceptance ===
  async getAcceptance(projectId: string) {
    // Check if project exists
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw new BadRequestException('Dự án không tồn tại');
    }

    // Get all order items for the project
    const orderItems = await this.prisma.orderItem.findMany({
      where: { projectId, deletedAt: null },
      include: {
        product: true,
        acceptanceItems: {
          where: { projectId },
        },
      },
    });

    // Map order items with acceptance data
    return orderItems.map((item) => ({
      orderItemId: item.id,
      productName: item.name,
      productCode: item.product?.code || null,
      unit: item.unit,
      qty: Number(item.qty),
      unitPrice: Number(item.unitPrice),
      amount: Number(item.amount),
      // Acceptance data
      acceptedQty: item.acceptanceItems.length > 0 ? Number(item.acceptanceItems[0].acceptedQty) : 0,
      unitPriceOverride: item.acceptanceItems.length > 0 && item.acceptanceItems[0].unitPrice !== null
        ? Number(item.acceptanceItems[0].unitPrice)
        : null,
      note: item.acceptanceItems.length > 0 ? item.acceptanceItems[0].note : null,
    }));
  }

  async saveAcceptance(projectId: string, items: {
    orderItemId: string;
    acceptedQty: number;
    unitPrice?: number | null;
    note?: string;
  }[]) {
    // Check if project exists
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw new BadRequestException('Dự án không tồn tại');
    }

    // Validate all order items belong to this project
    const orderItems = await this.prisma.orderItem.findMany({
      where: { projectId, deletedAt: null },
      select: { id: true },
    });

    const validItemIds = new Set(orderItems.map((item) => item.id));

    for (const item of items) {
      if (!validItemIds.has(item.orderItemId)) {
        throw new BadRequestException(`Order item ${item.orderItemId} không thuộc dự án này`);
      }
      if (item.acceptedQty < 0) {
        throw new BadRequestException('Số lượng nghiệm thu không được âm');
      }
      if (item.unitPrice !== undefined && item.unitPrice !== null && item.unitPrice < 0) {
        throw new BadRequestException('Đơn giá không được âm');
      }
    }

    // Upsert each acceptance item
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.orderAcceptanceItem.upsert({
          where: {
            projectId_orderItemId: {
              projectId,
              orderItemId: item.orderItemId,
            },
          },
          create: {
            projectId,
            orderItemId: item.orderItemId,
            acceptedQty: item.acceptedQty,
            unitPrice: item.unitPrice ?? null,
            note: item.note || null,
          },
          update: {
            acceptedQty: item.acceptedQty,
            unitPrice: item.unitPrice ?? null,
            note: item.note || null,
          },
        }),
      ),
    );

    // Return updated acceptance data
    return this.getAcceptance(projectId);
  }
}
