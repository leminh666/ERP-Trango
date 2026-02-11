import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private service: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách giao dịch' })
  @ApiQuery({ name: 'type', required: false, enum: ['INCOME', 'EXPENSE', 'TRANSFER'] })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'walletId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'isCommonCost', required: false, type: Boolean })
  @ApiQuery({ name: 'incomeCategoryId', required: false })
  @ApiQuery({ name: 'expenseCategoryId', required: false })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('walletId') walletId?: string,
    @Query('projectId') projectId?: string,
    @Query('isCommonCost') isCommonCost?: string,
    @Query('incomeCategoryId') incomeCategoryId?: string,
    @Query('expenseCategoryId') expenseCategoryId?: string,
    @Query('includeDeleted') includeDeleted?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll({
      type,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      walletId,
      projectId,
      isCommonCost: isCommonCost === 'true' ? true : isCommonCost === 'false' ? false : undefined,
      incomeCategoryId,
      expenseCategoryId,
      includeDeleted: includeDeleted === 'true',
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin giao dịch' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo giao dịch mới' })
  async create(
    @Body() data: {
      type: string;
      date: string;
      amount: number;
      walletId: string;
      incomeCategoryId?: string;
      expenseCategoryId?: string;
      projectId?: string;
      isCommonCost?: boolean;
      note?: string;
    },
    @Request() req?: { user: { id: string; email?: string } },
  ) {
    return this.service.create(data as any, req?.user?.id, req?.user?.email);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật giao dịch' })
  async update(
    @Param('id') id: string,
    @Body() data: {
      type?: string;
      date?: string;
      amount?: number;
      walletId?: string;
      incomeCategoryId?: string;
      expenseCategoryId?: string;
      projectId?: string;
      isCommonCost?: boolean;
      note?: string;
    },
    @Request() req?: { user: { id: string; email?: string } },
  ) {
    return this.service.update(id, data as any, req?.user?.id, req?.user?.email);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa giao dịch (soft delete)' })
  async delete(@Param('id') id: string, @Request() req?: { user: { id: string; email?: string } }) {
    return this.service.delete(id, req?.user?.id, req?.user?.email);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Khôi phục giao dịch' })
  async restore(@Param('id') id: string, @Request() req?: { user: { id: string; email?: string } }) {
    return this.service.restore(id, req?.user?.id, req?.user?.email);
  }
}
