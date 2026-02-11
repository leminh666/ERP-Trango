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

  async create(data: Prisma.CustomerCreateInput, userId?: string, userEmail?: string) {
    try {
      // Auto-generate code
      const lastCustomer = await this.prisma.customer.findFirst({
        orderBy: { code: 'desc' },
      });

      const lastCode = lastCustomer ? parseInt(lastCustomer.code.replace('KH', '')) : 0;
      const newCode = `KH${String(lastCode + 1).padStart(4, '0')}`;

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
