import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  private isAdmin(req: any): boolean {
    return req.user?.role === 'ADMIN';
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách nhân viên (ADMIN only)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'role', required: false, enum: ['ADMIN', 'STAFF'] })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  async findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Chỉ ADMIN được truy cập' };
    }

    return this.usersService.findAll({
      search: search || undefined,
      role: role || undefined,
      includeDeleted: includeDeleted === 'true',
    });
  }

  @Post()
  @ApiOperation({ summary: 'Tạo nhân viên (ADMIN only)' })
  async create(
    @Request() req: any,
    @Body()
    body: {
      email: string;
      name: string;
      password?: string;
      role?: 'ADMIN' | 'STAFF';
      phone?: string;
      age?: number;
      address?: string;
      avatarUrl?: string;
      note?: string;
    },
  ) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Chỉ ADMIN được thao tác' };
    }

    return this.usersService.create(body, {
      userId: req.user?.id,
      userEmail: req.user?.email,
      req,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy hồ sơ nhân viên (ADMIN only)' })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  async findOne(
    @Request() req: any,
    @Param('id') id: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Chỉ ADMIN được truy cập' };
    }

    return this.usersService.findOne(id, includeDeleted === 'true');
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật hồ sơ nhân viên (ADMIN only)' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      phone?: string | null;
      age?: number | null;
      address?: string | null;
      avatarUrl?: string | null;
      note?: string | null;
      role?: 'ADMIN' | 'STAFF';
      isActive?: boolean;
    },
  ) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Chỉ ADMIN được thao tác' };
    }

    return this.usersService.update(id, body, {
      userId: req.user?.id,
      userEmail: req.user?.email,
      req,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoá nhân viên (soft delete) (ADMIN only)' })
  async softDelete(@Request() req: any, @Param('id') id: string) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Chỉ ADMIN được thao tác' };
    }

    return this.usersService.softDelete(id, {
      userId: req.user?.id,
      userEmail: req.user?.email,
      req,
    });
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Khôi phục nhân viên (ADMIN only)' })
  async restore(@Request() req: any, @Param('id') id: string) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Chỉ ADMIN được thao tác' };
    }

    return this.usersService.restore(id, {
      userId: req.user?.id,
      userEmail: req.user?.email,
      req,
    });
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Đặt lại mật khẩu nhân viên về 123456 (ADMIN only)' })
  async resetPassword(@Request() req: any, @Param('id') id: string) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Chỉ ADMIN được thao tác' };
    }

    return this.usersService.resetPassword(id, {
      userId: req.user?.id,
      userEmail: req.user?.email,
      req,
    });
  }

  @Put(':id/permissions')
  @ApiOperation({ summary: 'Cập nhật quyền nhân viên (ADMIN only)' })
  async updatePermissions(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      permissions: Record<string, { view: boolean; edit: boolean; delete: boolean }>;
    },
  ) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Chỉ ADMIN được thao tác' };
    }

    return this.usersService.updatePermissions(id, body.permissions, {
      userId: req.user?.id,
      userEmail: req.user?.email,
      req,
    });
  }
}
