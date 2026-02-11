import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkshopsService } from './workshops.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('workshops')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workshops')
export class WorkshopsController {
  constructor(private workshopsService: WorkshopsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách xưởng gia công' })
  async findAll(
    @Query('search') search?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.workshopsService.findAll({ search, includeDeleted: includeDeleted === 'true' });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin xưởng gia công' })
  async findOne(@Param('id') id: string) {
    return this.workshopsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo xưởng gia công mới' })
  async create(
    @Body() data: { name: string; phone?: string; address?: string; note?: string },
    @Request() req?: { user: { id: string; email?: string } },
  ) {
    return this.workshopsService.create(data as any, req?.user?.id, req?.user?.email);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật xưởng gia công' })
  async update(
    @Param('id') id: string,
    @Body() data: Partial<{ name: string; phone: string; address: string; note: string }>,
    @Request() req?: { user: { id: string; email?: string } },
  ) {
    return this.workshopsService.update(id, data as any, req?.user?.id, req?.user?.email);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa xưởng gia công' })
  async delete(
    @Param('id') id: string,
    @Request() req?: { user: { id: string; email?: string } },
  ) {
    return this.workshopsService.delete(id, req?.user?.id, req?.user?.email);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Khôi phục xưởng gia công' })
  async restore(
    @Param('id') id: string,
    @Request() req?: { user: { id: string; email?: string } },
  ) {
    return this.workshopsService.restore(id, req?.user?.id, req?.user?.email);
  }
}
