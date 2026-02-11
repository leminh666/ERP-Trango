import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ExpenseCategoriesService } from './expense-categories.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('expense-categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expense-categories')
export class ExpenseCategoriesController {
  constructor(private service: ExpenseCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách danh mục chi' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  async findAll(
    @Query('search') search?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.service.findAll({
      search,
      includeDeleted: includeDeleted === 'true',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin danh mục chi' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo danh mục chi mới' })
  async create(
    @Body() data: { name: string; visualType?: string; iconKey?: string; imageUrl?: string; color?: string },
    @Request() req?: { user: { id: string; email?: string } },
  ) {
    return this.service.create(data as any, req?.user?.id, req?.user?.email);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật danh mục chi' })
  async update(
    @Param('id') id: string,
    @Body() data: { name?: string; visualType?: string; iconKey?: string; imageUrl?: string; color?: string },
    @Request() req?: { user: { id: string; email?: string } },
  ) {
    return this.service.update(id, data as any, req?.user?.id, req?.user?.email);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa danh mục chi (soft delete)' })
  async delete(
    @Param('id') id: string,
    @Request() req?: { user: { id: string; email?: string } },
  ) {
    return this.service.delete(id, req?.user?.id, req?.user?.email);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Khôi phục danh mục chi' })
  async restore(
    @Param('id') id: string,
    @Request() req?: { user: { id: string; email?: string } },
  ) {
    return this.service.restore(id, req?.user?.id, req?.user?.email);
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'Xem danh sách giao dịch đã dùng danh mục chi' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUsage(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getUsage(
      id,
      from,
      to,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }
}
