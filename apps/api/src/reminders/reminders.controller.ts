import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reminders')
export class RemindersController {
  constructor(private prisma: PrismaService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Tổng hợp nhắc việc (follow-up / stale orders / workshop jobs due)' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'includeDone', required: false, type: Boolean })
  async overview(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('includeDone') includeDone?: string,
  ) {
    const now = new Date();

    const startDate = from ? new Date(from) : undefined;
    const endDate = to ? new Date(to) : undefined;
    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
    }

    // A) Customer follow-ups (based on Customer.nextFollowUpAt)
    const customerWhere: any = {
      deletedAt: null,
      isActive: true,
      nextFollowUpAt: { not: null },
    };

    if (startDate || endDate) {
      customerWhere.nextFollowUpAt = {};
      if (startDate) customerWhere.nextFollowUpAt.gte = startDate;
      if (endDate) customerWhere.nextFollowUpAt.lte = endDate;
    }

    const customers = await this.prisma.customer.findMany({
      where: customerWhere,
      select: {
        id: true,
        name: true,
        phone: true,
        nextFollowUpAt: true,
        status: true,
        nextFollowUpNote: true,
      },
      orderBy: { nextFollowUpAt: 'asc' },
    });

    const customerFollowUps = customers
      .filter((c) => !!c.nextFollowUpAt)
      .map((c) => ({
        customerId: c.id,
        customerName: c.name,
        phone: c.phone,
        nextFollowUpAt: c.nextFollowUpAt,
        status: c.status,
        note: c.nextFollowUpNote,
        isOverdue: (c.nextFollowUpAt as Date) < now,
      }));

    // B) Stale orders (projects with updatedAt too old)
    // MVP threshold: 7 days
    const staleThresholdDays = 7;

    const projectWhere: any = {
      deletedAt: null,
    };

    // If user passes from/to, interpret it as updatedAt range filter (optional)
    if (startDate || endDate) {
      projectWhere.updatedAt = {};
      if (startDate) projectWhere.updatedAt.gte = startDate;
      if (endDate) projectWhere.updatedAt.lte = endDate;
    }

    const projects = await this.prisma.project.findMany({
      where: projectWhere,
      select: {
        id: true,
        code: true,
        name: true,
        stage: true,
        updatedAt: true,
        customer: { select: { name: true } },
      },
      orderBy: { updatedAt: 'asc' },
    });

    const staleOrders = projects
      .map((p) => {
        const updatedAt = p.updatedAt as Date;
        const daysSinceUpdate = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
        return {
          projectId: p.id,
          code: p.code,
          name: p.name,
          stage: p.stage,
          customerName: p.customer?.name || null,
          updatedAt: p.updatedAt,
          daysSinceUpdate,
        };
      })
      .filter((p) => p.daysSinceUpdate >= staleThresholdDays)
      .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);

    // C) Workshop jobs due/overdue + debtAmount
    const workshopJobWhere: any = {
      deletedAt: null,
      dueDate: { not: null },
    };

    if (startDate || endDate) {
      workshopJobWhere.dueDate = {};
      if (startDate) workshopJobWhere.dueDate.gte = startDate;
      if (endDate) workshopJobWhere.dueDate.lte = endDate;
    }

    const jobs = await this.prisma.workshopJob.findMany({
      where: workshopJobWhere,
      select: {
        id: true,
        code: true,
        title: true,
        amount: true,
        dueDate: true,
        workshop: { select: { name: true } },
        project: { select: { code: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const jobIds = jobs.map((j) => j.id);
    const expenses = jobIds.length
      ? await this.prisma.transaction.findMany({
          where: {
            deletedAt: null,
            type: 'EXPENSE',
            workshopJobId: { in: jobIds },
          },
          select: {
            workshopJobId: true,
            amount: true,
          },
        })
      : [];

    const paidMap = new Map<string, number>();
    for (const e of expenses) {
      if (!e.workshopJobId) continue;
      paidMap.set(e.workshopJobId, (paidMap.get(e.workshopJobId) || 0) + Number(e.amount));
    }

    const workshopJobsDue = jobs
      .filter((j) => !!j.dueDate)
      .map((j) => {
        const debtAmount = Number(j.amount) - (paidMap.get(j.id) || 0);
        const dueDate = j.dueDate as Date;
        return {
          jobId: j.id,
          code: j.code,
          title: j.title,
          workshopName: j.workshop?.name || null,
          projectCode: j.project?.code || null,
          dueDate: j.dueDate,
          debtAmount,
          isOverdue: dueDate < now,
        };
      })
      .sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        return new Date(a.dueDate as any).getTime() - new Date(b.dueDate as any).getTime();
      });

    // includeDone is reserved for future use (follow-up DONE state, etc.)
    // Currently: no DONE flags in these aggregates.
    void includeDone;

    return {
      customerFollowUps,
      staleOrders,
      workshopJobsDue,
    };
  }

  @Get('customers')
  @ApiOperation({ summary: 'Lấy danh sách khách hàng cần nhắc xử lý' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'overdueOnly', required: false, type: Boolean })
  async getCustomerReminders(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('overdueOnly') overdueOnly?: string,
  ) {
    const where: any = {
      deletedAt: null,
      isActive: true,
      nextFollowUpAt: { not: null },
    };

    if (overdueOnly === 'true') {
      where.nextFollowUpAt = { lt: new Date() };
    } else if (from || to) {
      where.nextFollowUpAt = {};
      if (from) where.nextFollowUpAt.gte = new Date(from);
      if (to) where.nextFollowUpAt.lte = new Date(to);
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
      orderBy: { nextFollowUpAt: 'asc' },
    });

    return customers;
  }
}
