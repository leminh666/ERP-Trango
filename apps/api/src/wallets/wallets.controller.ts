import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private service: WalletsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách sổ quỹ' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  async findAll(
    @Query('search') search?: string,
    @Query('includeDeleted') includeDeleted?: string,
    @Request() req?: { user: { role: string } },
  ) {
    return this.service.findAll({
      search,
      includeDeleted: includeDeleted === 'true',
      userRole: req?.user?.role || 'STAFF',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin sổ quỹ' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo sổ quỹ mới (ADMIN only)' })
  async create(
    @Body() data: {
      name: string;
      type?: string;
      iconType: string;
      iconKey?: string;
      imageUrl?: string;
      note?: string;
      openingBalance?: number;
    },
    @Request() req?: { user: { id: string; email?: string; role: string } },
  ) {
    return this.service.create(data as any, req?.user?.id, req?.user?.email, req?.user?.role);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật sổ quỹ (ADMIN only)' })
  async update(
    @Param('id') id: string,
    @Body() data: {
      name?: string;
      type?: string;
      iconType?: string;
      iconKey?: string;
      imageUrl?: string;
      note?: string;
    },
    @Request() req?: { user: { id: string; email?: string; role: string } },
  ) {
    return this.service.update(id, data as any, req?.user?.id, req?.user?.email, req?.user?.role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa sổ quỹ (ADMIN only)' })
  async delete(
    @Param('id') id: string,
    @Request() req?: { user: { id: string; email?: string; role: string } },
  ) {
    return this.service.delete(id, req?.user?.id, req?.user?.email, req?.user?.role);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Khôi phục sổ quỹ (ADMIN only)' })
  async restore(
    @Param('id') id: string,
    @Request() req?: { user: { id: string; email?: string; role: string } },
  ) {
    return this.service.restore(id, req?.user?.id, req?.user?.email, req?.user?.role);
  }

  @Get(':id/usage/summary')
  @ApiOperation({ summary: 'Lấy báo cáo sử dụng sổ quỹ theo danh mục' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async getUsageSummary(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getUsageSummary(
      id,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get(':id/adjustments')
  @ApiOperation({ summary: 'Lấy lịch sử điều chỉnh số dư của sổ quỹ' })
  async getAdjustments(
    @Param('id') id: string,
  ) {
    return this.service.getAdjustments(id);
  }

  @Get(':id/transfers')
  @ApiOperation({ summary: 'Lấy lịch sử chuyển tiền của sổ quỹ' })
  async getTransfers(
    @Param('id') id: string,
  ) {
    return this.service.getTransfers(id);
  }
}
