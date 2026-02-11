import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';

export interface UserWithoutPassword {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  age?: number | null;
  address?: string | null;
  avatarUrl?: string | null;
  note?: string | null;
  role: string;
  permissions?: Record<string, { view: boolean; edit: boolean; delete: boolean }> | null;
  isActive: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  age: true,
  address: true,
  avatarUrl: true,
  note: true,
  role: true,
  permissions: true,
  isActive: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(params: { search?: string; role?: string; includeDeleted?: boolean }): Promise<UserWithoutPassword[]> {
    const { search, role, includeDeleted } = params;

    const where: any = {
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(role ? { role } : {}),
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: userSelect,
    }) as any;
  }

  async findOne(id: string, includeDeleted = false): Promise<UserWithoutPassword> {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      select: userSelect,
    });

    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    return user as any;
  }

  async create(
    data: {
      email: string;
      name: string;
      password?: string;
      role?: 'ADMIN' | 'STAFF';
      phone?: string;
      age?: number;
      address?: string;
      note?: string;
      avatarUrl?: string;
    },
    actor: { userId: string; userEmail?: string; req?: any },
  ): Promise<UserWithoutPassword> {
    if (!data.email?.trim()) throw new BadRequestException('Email là bắt buộc');
    if (!data.name?.trim()) throw new BadRequestException('Tên là bắt buộc');

    const existed = await this.prisma.user.findUnique({ where: { email: data.email.trim() } });
    if (existed && !existed.deletedAt) {
      throw new BadRequestException('Email đã tồn tại');
    }

    const rawPassword = (data.password && data.password.trim()) ? data.password.trim() : '123456';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const created = await this.prisma.user.create({
      data: {
        email: data.email.trim(),
        password: passwordHash,
        name: data.name.trim(),
        phone: data.phone || null,
        age: data.age ?? null,
        address: data.address || null,
        avatarUrl: data.avatarUrl || null,
        note: data.note || (data.password ? null : 'Mật khẩu mặc định: 123456 (bắt buộc đổi sau)'),
        role: (data.role as any) || 'STAFF',
        isActive: true,
        deletedAt: null,
      },
      select: userSelect,
    });

    await this.audit.logWithReq(
      {
        entity: 'User',
        entityId: created.id,
        action: 'CREATE',
        beforeJson: null,
        afterJson: created as any,
        userId: actor.userId,
        userEmail: actor.userEmail,
      },
      actor.req,
    );

    return created as any;
  }

  async update(
    id: string,
    data: {
      name?: string;
      phone?: string | null;
      age?: number | null;
      address?: string | null;
      avatarUrl?: string | null;
      note?: string | null;
      role?: 'ADMIN' | 'STAFF';
      isActive?: boolean;
    },
    actor: { userId: string; userEmail?: string; req?: any },
  ): Promise<UserWithoutPassword> {
    const before = await this.prisma.user.findFirst({ where: { id }, select: userSelect });
    if (!before) throw new NotFoundException('User không tồn tại');

    // Do not allow demote self
    if (id === actor.userId && data.role && data.role !== 'ADMIN') {
      throw new BadRequestException('Không thể tự hạ quyền của chính mình');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: data.name?.trim() ?? undefined,
        phone: data.phone === undefined ? undefined : data.phone,
        age: data.age === undefined ? undefined : data.age,
        address: data.address === undefined ? undefined : data.address,
        avatarUrl: data.avatarUrl === undefined ? undefined : data.avatarUrl,
        note: data.note === undefined ? undefined : data.note,
        role: data.role as any,
        isActive: data.isActive,
      },
      select: userSelect,
    });

    await this.audit.logWithReq(
      {
        entity: 'User',
        entityId: updated.id,
        action: 'UPDATE',
        beforeJson: before as any,
        afterJson: updated as any,
        userId: actor.userId,
        userEmail: actor.userEmail,
      },
      actor.req,
    );

    return updated as any;
  }

  async softDelete(
    id: string,
    actor: { userId: string; userEmail?: string; req?: any },
  ): Promise<{ ok: true }> {
    if (id === actor.userId) {
      throw new BadRequestException('Không thể xoá chính mình');
    }

    const before = await this.prisma.user.findFirst({ where: { id, deletedAt: null }, select: userSelect });
    if (!before) throw new NotFoundException('User không tồn tại hoặc đã bị xoá');

    const after = await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
      select: userSelect,
    });

    await this.audit.logWithReq(
      {
        entity: 'User',
        entityId: id,
        action: 'DELETE',
        beforeJson: before as any,
        afterJson: after as any,
        userId: actor.userId,
        userEmail: actor.userEmail,
      },
      actor.req,
    );

    return { ok: true };
  }

  async restore(
    id: string,
    actor: { userId: string; userEmail?: string; req?: any },
  ): Promise<UserWithoutPassword> {
    const before = await this.prisma.user.findFirst({ where: { id }, select: userSelect });
    if (!before) throw new NotFoundException('User không tồn tại');

    if (!before.deletedAt) {
      throw new BadRequestException('User chưa bị xoá');
    }

    const after = await this.prisma.user.update({
      where: { id },
      data: { deletedAt: null, isActive: true },
      select: userSelect,
    });

    await this.audit.logWithReq(
      {
        entity: 'User',
        entityId: id,
        action: 'RESTORE',
        beforeJson: before as any,
        afterJson: after as any,
        userId: actor.userId,
        userEmail: actor.userEmail,
      },
      actor.req,
    );

    return after as any;
  }

  async resetPassword(
    id: string,
    actor: { userId: string; userEmail?: string; req?: any },
  ): Promise<{ ok: true }> {
    if (id === actor.userId) {
      throw new BadRequestException('Không thể reset mật khẩu của chính mình theo cách này');
    }

    const before = await this.prisma.user.findFirst({ where: { id }, select: userSelect });
    if (!before) throw new NotFoundException('User không tồn tại');

    const passwordHash = await bcrypt.hash('123456', 10);

    await this.prisma.user.update({
      where: { id },
      data: { password: passwordHash },
    });

    await this.audit.logWithReq(
      {
        entity: 'User',
        entityId: id,
        action: 'UPDATE',
        beforeJson: { id: before.id, email: before.email } as any,
        afterJson: { id: before.id, email: before.email, note: 'Reset password to 123456' } as any,
        userId: actor.userId,
        userEmail: actor.userEmail,
      },
      actor.req,
    );

    return { ok: true };
  }

  async updatePermissions(
    id: string,
    permissions: Record<string, { view: boolean; edit: boolean; delete: boolean }>,
    actor: { userId: string; userEmail?: string; req?: any },
  ): Promise<UserWithoutPassword> {
    const before = await this.prisma.user.findFirst({ where: { id }, select: userSelect });
    if (!before) throw new NotFoundException('User không tồn tại');

    // Cannot modify self permissions
    if (id === actor.userId) {
      throw new BadRequestException('Không thể tự thay đổi quyền của chính mình');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { permissions: permissions as any },
      select: userSelect,
    });

    await this.audit.logWithReq(
      {
        entity: 'User',
        entityId: id,
        action: 'UPDATE',
        beforeJson: { permissions: before.permissions } as any,
        afterJson: { permissions } as any,
        userId: actor.userId,
        userEmail: actor.userEmail,
      },
      actor.req,
    );

    return updated as any;
  }
}
