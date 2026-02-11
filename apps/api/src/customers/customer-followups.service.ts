import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, CustomerFollowUp } from '@prisma/client';

@Injectable()
export class CustomerFollowUpsService {
  constructor(private prisma: PrismaService) {}

  async findByCustomer(customerId: string) {
    return this.prisma.customerFollowUp.findMany({
      where: { customerId },
      orderBy: { scheduledAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async create(params: {
    customerId: string;
    type: string;
    scheduledAt: Date;
    outcomeNote?: string;
    createdByUserId?: string;
  }) {
    const { customerId, type, scheduledAt, outcomeNote, createdByUserId } = params;

    // Verify customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Khách hàng không tồn tại');
    }

    // Create follow-up
    const followUp = await this.prisma.customerFollowUp.create({
      data: {
        customerId,
        type: type as any,
        scheduledAt,
        outcome: 'PENDING',
        outcomeNote,
        createdByUserId,
      },
    });

    // If scheduledAt is in the future, update customer's nextFollowUpAt
    if (scheduledAt > new Date()) {
      const updateData: Prisma.CustomerUpdateInput = {
        nextFollowUpAt: scheduledAt,
        nextFollowUpNote: outcomeNote || null,
      };

      // Update status based on type
      if (type === 'SURVEY') {
        updateData.status = 'SURVEY_SCHEDULED';
      } else {
        updateData.status = 'APPOINTMENT_SET';
      }

      await this.prisma.customer.update({
        where: { id: customerId },
        data: updateData,
      });
    }

    return followUp;
  }

  async update(id: string, data: Prisma.CustomerFollowUpUpdateInput) {
    const followUp = await this.prisma.customerFollowUp.findUnique({
      where: { id },
    });

    if (!followUp) {
      throw new NotFoundException('Lịch hẹn không tồn tại');
    }

    return this.prisma.customerFollowUp.update({
      where: { id },
      data,
    });
  }

  async markDone(id: string, outcomeNote?: string) {
    const followUp = await this.prisma.customerFollowUp.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!followUp) {
      throw new NotFoundException('Lịch hẹn không tồn tại');
    }

    // Update follow-up
    const updated = await this.prisma.customerFollowUp.update({
      where: { id },
      data: {
        outcome: 'DONE',
        outcomeNote,
      },
    });

    // Find next pending follow-up
    const nextFollowUp = await this.prisma.customerFollowUp.findFirst({
      where: {
        customerId: followUp.customerId,
        outcome: 'PENDING',
        scheduledAt: { gt: new Date() },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // Update customer's nextFollowUpAt
    await this.prisma.customer.update({
      where: { id: followUp.customerId },
      data: {
        nextFollowUpAt: nextFollowUp?.scheduledAt || null,
        nextFollowUpNote: nextFollowUp?.outcomeNote || null,
      },
    });

    return updated;
  }

  async cancel(id: string, outcomeNote?: string) {
    const followUp = await this.prisma.customerFollowUp.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!followUp) {
      throw new NotFoundException('Lịch hẹn không tồn tại');
    }

    // Update follow-up
    const updated = await this.prisma.customerFollowUp.update({
      where: { id },
      data: {
        outcome: 'CANCELLED',
        outcomeNote,
      },
    });

    // Find next pending follow-up
    const nextFollowUp = await this.prisma.customerFollowUp.findFirst({
      where: {
        customerId: followUp.customerId,
        outcome: 'PENDING',
        scheduledAt: { gt: new Date() },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // Update customer's nextFollowUpAt
    await this.prisma.customer.update({
      where: { id: followUp.customerId },
      data: {
        nextFollowUpAt: nextFollowUp?.scheduledAt || null,
        nextFollowUpNote: nextFollowUp?.outcomeNote || null,
        status: nextFollowUp ? undefined : 'CONTACTED',
      },
    });

    return updated;
  }
}

