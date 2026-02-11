import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { TransfersService, TransferCreateDto } from './transfers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('transfers')
@UseGuards(JwtAuthGuard)
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  private isAdmin(req: any): boolean {
    return req.user?.role === 'ADMIN';
  }

  @Get()
  async findAll(@Request() req: any, @Query() query: any) {
    const { from, to, walletId, walletToId, includeDeleted } = query;

    return this.transfersService.findAll({
      from,
      to,
      walletId,
      walletToId,
      includeDeleted: includeDeleted === 'true',
      userRole: req.user?.role,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.transfersService.findOne(id);
  }

  @Post()
  async create(@Request() req: any, @Body() data: TransferCreateDto) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Chỉ ADMIN được thực hiện thao tác này' };
    }

    return this.transfersService.create(
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

    return this.transfersService.delete(
      id,
      req.user?.id,
      req.user?.email,
    );
  }

  @Patch(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() data: Partial<TransferCreateDto>) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Chỉ ADMIN được thực hiện thao tác này' };
    }

    return this.transfersService.update(
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

    return this.transfersService.restore(
      id,
      req.user?.id,
      req.user?.email,
    );
  }
}

