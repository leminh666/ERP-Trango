import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách nhà cung cấp' })
  async findAll(
    @Query('search') search?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.suppliersService.findAll({ search, includeDeleted: includeDeleted === 'true' });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin nhà cung cấp' })
  async findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Lấy dữ liệu liên quan của nhà cung cấp' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async getRelated(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.suppliersService.findRelated(id, from, to);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo nhà cung cấp mới' })
  async create(
    @Body() data: { name: string; phone?: string; address?: string; region?: string; city?: string; district?: string; note?: string },
    @Request() req?: { user: { id: string; email?: string } },
  ) {
    return this.suppliersService.create(data as any, req?.user?.id, req?.user?.email);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật nhà cung cấp' })
  async update(
    @Param('id') id: string,
    @Body() data: Partial<{ name: string; phone: string; address: string; region: string; city: string; district: string; note: string }>,
    @Request() req?: { user: { id: string; email?: string } },
  ) {
    return this.suppliersService.update(id, data as any, req?.user?.id, req?.user?.email);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa nhà cung cấp' })
  async delete(
    @Param('id') id: string,
    @Request() req?: { user: { id: string; email?: string } },
  ) {
    return this.suppliersService.delete(id, req?.user?.id, req?.user?.email);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Khôi phục nhà cung cấp' })
  async restore(
    @Param('id') id: string,
    @Request() req?: { user: { id: string; email?: string } },
  ) {
    return this.suppliersService.restore(id, req?.user?.id, req?.user?.email);
  }
}
