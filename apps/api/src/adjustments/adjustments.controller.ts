import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AdjustmentsService, AdjustmentCreateDto } from './adjustments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('adjustments')
@UseGuards(JwtAuthGuard)
export class AdjustmentsController {
  constructor(private readonly adjustmentsService: AdjustmentsService) {}

  private isAdmin(req: any): boolean {
    return req.user?.role === 'ADMIN';
  }

  @Get()
  async findAll(@Request() req: any, @Query() query: any) {
    const { from, to, walletId, includeDeleted } = query;

    return this.adjustmentsService.findAll({
      from,
      to,
      walletId,
      includeDeleted: includeDeleted === 'true',
      userRole: req.user?.role,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.adjustmentsService.findOne(id);
  }

  @Post()
  async create(@Request() req: any, @Body() data: AdjustmentCreateDto) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Chỉ ADMIN được thực hiện thao tác này' };
    }

    return this.adjustmentsService.create(
      data,
      req.user?.id,
      req.user?.email,
    );
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Chỉ ADMIN được thực hiện thao tác này' };
    }

    return this.adjustmentsService.delete(
      id,
      req.user?.id,
      req.user?.email,
    );
  }

  @Patch(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() data: Partial<AdjustmentCreateDto>) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Chỉ ADMIN được thực hiện thao tác này' };
    }

    return this.adjustmentsService.update(
      id,
      data,
      req.user?.id,
      req.user?.email,
    );
  }

  @Post(':id/restore')
  async restore(@Request() req: any, @Param('id') id: string) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Chỉ ADMIN được thực hiện thao tác này' };
    }

    return this.adjustmentsService.restore(
      id,
      req.user?.id,
      req.user?.email,
    );
  }
}

