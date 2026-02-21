'use strict';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrmStage, CrmActivityType, FollowUpStatus, Priority, Prisma } from '@prisma/client';

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  // ========== CRM CUSTOMER ==========
  
  async findAllCrmCustomers(params: {
    search?: string;
    stage?: CrmStage;
    ownerUserId?: string;
    source?: string;
    includeOverdue?: boolean;
    userId?: string; // For RBAC - if provided, non-admin can only see their own
    userRole?: string;
  }) {
    const { search, stage, ownerUserId, source, includeOverdue, userId, userRole } = params;

    const where: any = {};
    
    // RBAC: Non-admin users can only see their own customers
    if (userRole !== 'ADMIN' && userId) {
      where.OR = [
        { ownerUserId: userId },
        { customer: { ownerUserId: userId } },
      ];
    }

    if (search) {
      where.OR = [
        ...(where.OR || []),
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (stage) {
      where.stage = stage;
    }

    if (ownerUserId) {
      where.ownerUserId = ownerUserId;
    }

    if (source) {
      where.customer = {
        ...where.customer,
        sourceChannel: source as any,
      };
    }

    // Filter overdue follow-ups - check CrmActivity nextFollowUpAt
    if (includeOverdue) {
      where.activities = {
        some: {
          nextFollowUpAt: {
            lt: new Date(),
          },
          followUpStatus: 'PENDING',
        },
      };
    }

    return this.prisma.crmCustomer.findMany({
      where,
      include: {
        customer: {
          include: {
            owner: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        ownerUser: {
          select: { id: true, name: true, email: true },
        },
        activities: {
          where: {
            followUpStatus: 'PENDING',
            nextFollowUpAt: { not: null },
          },
          orderBy: { nextFollowUpAt: 'asc' },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async findOneCrmCustomer(customerId: string, userId?: string, userRole?: string) {
    const where: any = { customerId };

    // RBAC check
    if (userRole !== 'ADMIN' && userId) {
      where.OR = [
        { ownerUserId: userId },
        { customer: { ownerUserId: userId } },
      ];
    }

    return this.prisma.crmCustomer.findFirst({
      where,
      include: {
        customer: {
          include: {
            owner: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        ownerUser: {
          select: { id: true, name: true, email: true },
        },
        activities: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        stageHistories: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async createCrmCustomer(data: {
    customerId: string;
    ownerUserId?: string;
    source?: string;
    sourceNote?: string;
  }) {
    // Check if CRM record already exists
    const existing = await this.prisma.crmCustomer.findUnique({
      where: { customerId: data.customerId },
    });

    if (existing) {
      return existing;
    }

    // Get customer info
    const customer = await this.prisma.customer.findUnique({
      where: { id: data.customerId },
    });

    return this.prisma.crmCustomer.create({
      data: {
        customerId: data.customerId,
        ownerUserId: data.ownerUserId || customer?.ownerUserId || undefined,
        stage: CrmStage.LEAD,
      },
      include: {
        customer: true,
      },
    });
  }

  async updateCrmCustomer(
    customerId: string,
    data: {
      stage?: CrmStage;
      area?: string;
      layout?: string;
      style?: string;
      architectureType?: string;
      briefNote?: string;
      ownerUserId?: string;
      nextFollowUpAt?: string;
      nextFollowUpNote?: string;
    },
    userId: string,
  ) {
    const current = await this.prisma.crmCustomer.findUnique({
      where: { customerId },
    });

    // If stage is changing, create history record
    if (data.stage && current && data.stage !== current.stage) {
      await this.prisma.crmStageHistory.create({
        data: {
          customerId: current.id,
          userId,
          fromStage: current.stage,
          toStage: data.stage,
        },
      });
    }

    // Update CrmCustomer
    const updateData: any = {
      area: data.area,
      layout: data.layout,
      style: data.style,
      architectureType: data.architectureType,
      briefNote: data.briefNote,
      ownerUserId: data.ownerUserId,
      updatedAt: new Date(),
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    await this.prisma.crmCustomer.update({
      where: { customerId },
      data: updateData,
    });

    // If nextFollowUpAt is provided, update the Customer table
    if (data.nextFollowUpAt) {
      await this.prisma.customer.update({
        where: { id: customerId },
        data: {
          nextFollowUpAt: new Date(data.nextFollowUpAt),
          nextFollowUpNote: data.nextFollowUpNote || null,
        },
      });
    }

    return this.prisma.crmCustomer.update({
      where: { customerId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        customer: true,
        stageHistories: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  // ========== CRM ACTIVITIES ==========

  async createActivity(data: {
    customerId: string;
    userId: string;
    type: CrmActivityType;
    outcome?: string;
    note?: string;
    nextFollowUpAt?: Date;
    nextFollowUpNote?: string;
    priority?: Priority;
  }) {
    // Get or create CRM customer
    let crmCustomer = await this.prisma.crmCustomer.findUnique({
      where: { customerId: data.customerId },
    });

    if (!crmCustomer) {
      crmCustomer = await this.prisma.crmCustomer.create({
        data: {
          customerId: data.customerId,
          stage: CrmStage.LEAD,
        },
      });
    }

    // Determine follow-up status
    let followUpStatus: FollowUpStatus = FollowUpStatus.PENDING;
    if (!data.nextFollowUpAt) {
      followUpStatus = FollowUpStatus.DONE;
    } else if (data.nextFollowUpAt < new Date()) {
      followUpStatus = FollowUpStatus.MISSED;
    }

    // Create activity
    const activity = await this.prisma.crmActivity.create({
      data: {
        customerId: crmCustomer.id,
        userId: data.userId,
        type: data.type,
        outcome: data.outcome,
        note: data.note,
        nextFollowUpAt: data.nextFollowUpAt,
        nextFollowUpNote: data.nextFollowUpNote,
        followUpStatus,
        priority: data.priority || Priority.MEDIUM,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // If there's a next follow-up, update the Customer's nextFollowUpAt
    if (data.nextFollowUpAt) {
      await this.prisma.customer.update({
        where: { id: data.customerId },
        data: {
          nextFollowUpAt: data.nextFollowUpAt,
          nextFollowUpNote: data.nextFollowUpNote,
        },
      });
    }

    return activity;
  }

  async updateActivity(
    activityId: string,
    data: {
      followUpStatus?: FollowUpStatus;
      outcome?: string;
      note?: string;
    },
  ) {
    const updateData: any = {};
    
    if (data.followUpStatus) {
      updateData.followUpStatus = data.followUpStatus;
    }
    if (data.outcome !== undefined) {
      updateData.outcome = data.outcome;
    }
    if (data.note !== undefined) {
      updateData.note = data.note;
    }

    return this.prisma.crmActivity.update({
      where: { id: activityId },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async getCustomerActivities(
    customerId: string,
    userId?: string,
    userRole?: string,
  ) {
    const crmCustomer = await this.prisma.crmCustomer.findUnique({
      where: { customerId },
    });

    if (!crmCustomer) return [];

    // RBAC check
    const where: any = { customerId: crmCustomer.id };
    if (userRole !== 'ADMIN' && userId) {
      where.userId = userId;
    }

    return this.prisma.crmActivity.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ========== SCHEDULE / FOLLOW-UPS ==========

  async getSchedule(params: {
    from?: Date;
    to?: Date;
    ownerUserId?: string;
    status?: string;
    userId?: string;
    userRole?: string;
  }) {
    const { from, to, ownerUserId, userId, userRole } = params;

    // Query from CrmActivity instead of CrmCustomer
    const where: any = {
      nextFollowUpAt: { not: null },
      followUpStatus: FollowUpStatus.PENDING,
    };

    if (from && to) {
      where.nextFollowUpAt = {
        gte: from,
        lte: to,
      };
    } else if (from) {
      where.nextFollowUpAt = { gte: from };
    } else if (to) {
      where.nextFollowUpAt = { lte: to };
    }

    // RBAC - filter by owner
    if (userRole !== 'ADMIN' && userId) {
      where.customer = {
        OR: [
          { ownerUserId: userId },
          { crmCustomer: { ownerUserId: userId } },
        ],
      };
    } else if (ownerUserId) {
      where.customer = {
        OR: [
          { ownerUserId },
          { crmCustomer: { ownerUserId } },
        ],
      };
    }

    const activities = await this.prisma.crmActivity.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        customer: {
          include: {
            customer: {
              select: { id: true, name: true, phone: true, address: true, code: true },
            },
            ownerUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: {
        nextFollowUpAt: 'asc',
      },
    });

    // Transform to match CrmScheduleItem structure
    return activities.map(activity => ({
      id: activity.id,
      customerId: activity.customer.customerId,
      stage: activity.customer.stage,
      area: activity.customer.area,
      layout: activity.customer.layout,
      style: activity.customer.style,
      architectureType: activity.customer.architectureType,
      briefNote: activity.customer.briefNote,
      ownerUserId: activity.customer.ownerUserId,
      createdAt: activity.createdAt,
      updatedAt: activity.customer.updatedAt,
      nextFollowUpAt: activity.nextFollowUpAt,
      nextFollowUpNote: activity.nextFollowUpNote,
      followUpStatus: activity.followUpStatus,
      customer: {
        ...activity.customer.customer,
        nextFollowUpAt: activity.nextFollowUpAt,
        nextFollowUpNote: activity.nextFollowUpNote,
      },
      ownerUser: activity.customer.ownerUser,
    }));
  }

  // ========== REPORTS ==========

  async getReport(params: {
    from?: Date;
    to?: Date;
    ownerUserId?: string;
    source?: string;
    userId?: string;
    userRole?: string;
  }) {
    const { from, to, ownerUserId, source, userId, userRole } = params;

    // Base where clause with RBAC
    let baseWhere: any = {};

    if (userRole !== 'ADMIN' && userId) {
      baseWhere.OR = [
        { ownerUserId: userId },
        { customer: { ownerUserId: userId } },
      ];
    }

    // Date range
    if (from || to) {
      baseWhere.createdAt = {};
      if (from) baseWhere.createdAt.gte = from;
      if (to) baseWhere.createdAt.lte = to;
    }

    if (source) {
      baseWhere.customer = {
        ...baseWhere.customer,
        sourceChannel: source as any,
      };
    }

    if (ownerUserId) {
      baseWhere = {
        ...baseWhere,
        OR: [
          { ownerUserId },
          { customer: { ownerUserId } },
        ],
      };
    }

    // 1. Total leads
    const totalLeads = await this.prisma.crmCustomer.count({
      where: baseWhere,
    });

    // 2. Stage distribution
    const stageDistribution = await this.prisma.crmCustomer.groupBy({
      by: ['stage'],
      where: baseWhere,
      _count: true,
    });

    // 3. Activities count
    const activitiesCount = await this.prisma.crmActivity.count({
      where: {
        customer: baseWhere,
      },
    });

    // 4. Follow-ups stats
    const allCustomers = await this.prisma.crmCustomer.findMany({
      where: baseWhere,
      include: {
        customer: {
          include: {
            followUps: true,
          },
        },
      },
    });

    const totalFollowUps = allCustomers.reduce(
      (acc, c) => acc + (c.customer.followUps?.length || 0),
      0,
    );

    // 5. Conversion rates
    const stageCounts = stageDistribution.reduce(
      (acc, s) => {
        acc[s.stage] = s._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    const leadToQuoted = stageCounts[CrmStage.LEAD] > 0 
      ? ((stageCounts[CrmStage.QUOTED] || 0) / stageCounts[CrmStage.LEAD]) * 100 
      : 0;
    
    const quotedToContract = stageCounts[CrmStage.QUOTED] > 0 
      ? ((stageCounts[CrmStage.CONTRACT_SIGNED] || 0) / stageCounts[CrmStage.QUOTED]) * 100 
      : 0;
    
    const leadToContract = stageCounts[CrmStage.LEAD] > 0 
      ? ((stageCounts[CrmStage.CONTRACT_SIGNED] || 0) / stageCounts[CrmStage.LEAD]) * 100 
      : 0;

    // 6. By user
    const byUser = await this.prisma.crmCustomer.groupBy({
      by: ['ownerUserId'],
      where: {
        ...baseWhere,
        ownerUserId: { not: null },
      },
      _count: true,
    });

    // Get user details
    const userIds = byUser.map(u => u.ownerUserId).filter(Boolean);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds as string[] } },
      select: { id: true, name: true, email: true },
    });

    const userMap = users.reduce((acc, u) => {
      acc[u.id] = u;
      return acc;
    }, {} as Record<string, any>);

    return {
      totalLeads,
      stageDistribution: stageCounts,
      activitiesCount,
      totalFollowUps,
      conversionRates: {
        leadToQuoted: Math.round(leadToQuoted * 10) / 10,
        quotedToContract: Math.round(quotedToContract * 10) / 10,
        leadToContract: Math.round(leadToContract * 10) / 10,
      },
      byUser: byUser.map(u => ({
        userId: u.ownerUserId,
        user: userMap[u.ownerUserId as string] || null,
        count: u._count,
      })),
    };
  }

  // ========== KPI FOR CUSTOMER ==========
  
  async getCustomerKpi(customerId: string) {
    // Get all projects for this customer (including discountAmount)
    const projects = await this.prisma.project.findMany({
      where: { customerId, deletedAt: null },
      include: {
        orderItems: { where: { deletedAt: null }},
      },
    });

    // totalAmount = sum(orderItems.amount) - project.discountAmount (after discount)
    const totalAmount = projects.reduce((sum, project) => {
      const rawTotal = project.orderItems.reduce((itemSum, item) => {
        return itemSum + Number(item.amount || 0);
      }, 0);
      const discount = Number(project.discountAmount || 0);
      return sum + Math.max(0, rawTotal - discount);
    }, 0);

    // Get all income transactions (đã thanh toán)
    const incomeTransactions = await this.prisma.transaction.findMany({
      where: {
        project: { customerId },
        type: 'INCOME',
      },
    });
    const paidAmount = incomeTransactions.reduce((sum, t) => {
      return sum + Number(t.amount || 0);
    }, 0);

    // Calculate debt (công nợ)
    const debtAmount = Math.max(0, totalAmount - paidAmount);

    return {
      totalAmount,
      paidAmount,
      debtAmount,
    };
  }
}

