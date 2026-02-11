import { Controller, Get, Put, Post, Body, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService, SystemSettings } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private service: SettingsService) {}

  private requireAdmin(req: Request): void {
    if ((req as any).user?.role !== 'ADMIN') {
      throw new ForbiddenException('Chỉ ADMIN được thao tác');
    }
  }

  @Get()
  @ApiOperation({ summary: 'Lấy cấu hình hệ thống (ADMIN only)' })
  async getSettings(@Req() req: Request) {
    this.requireAdmin(req);
    const userId = (req as any).user?.id;
    return this.service.getSettings(userId);
  }

  @Post('test')
  @ApiOperation({ summary: 'Test endpoint' })
  async testEndpoint(@Req() req: Request) {
    return { success: true, message: 'Test endpoint works' };
  }

  @Put()
  @ApiOperation({ summary: 'Cập nhật cấu hình hệ thống (ADMIN only)' })
  async updateSettings(@Req() req: Request, @Body() payload: Partial<SystemSettings>) {
    this.requireAdmin(req);
    const userId = (req as any).user?.id;
    const userEmail = (req as any).user?.email;
    return this.service.updateSettings(userId, payload, userEmail);
  }

  @Get('wallets')
  @ApiOperation({ summary: 'Lấy danh sách ví cho dropdown' })
  async getWallets() {
    return this.service.getWallets();
  }

  @Get('income-categories')
  @ApiOperation({ summary: 'Lấy danh mục thu cho dropdown' })
  async getIncomeCategories() {
    return this.service.getIncomeCategories();
  }

  @Get('expense-categories')
  @ApiOperation({ summary: 'Lấy danh mục chi cho dropdown' })
  async getExpenseCategories() {
    return this.service.getExpenseCategories();
  }
}
