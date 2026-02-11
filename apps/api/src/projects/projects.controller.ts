import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private service: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo dự án/đơn hàng mới' })
  async create(@Request() req: any, @Body() body: { name: string; customerId: string; deadline?: string; address?: string; note?: string }) {
    return this.service.create(
      body,
      req.user?.id,
      req.user?.email,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách dự án' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  @ApiQuery({ name: 'stage', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  async findAll(
    @Query('search') search?: string,
    @Query('includeDeleted') includeDeleted?: string,
    @Query('stage') stage?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.service.findAll({
      search,
      includeDeleted: includeDeleted === 'true',
      stage,
      customerId,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Lấy tổng hợp tài chính đơn hàng' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'stage', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  async getSummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('stage') stage?: string,
    @Query('customerId') customerId?: string,
    @Query('search') search?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.service.getSummary({
      from,
      to,
      stage,
      customerId,
      search,
      includeDeleted: includeDeleted === 'true',
    });
  }

  @Get('kanban')
  @ApiOperation({ summary: 'Kanban dự án theo stage' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  async getKanban(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.service.getKanban({
      from,
      to,
      search,
      customerId,
    });
  }

  @Post(':id/stage')
  @ApiOperation({ summary: 'Cập nhật stage dự án' })
  async updateStage(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { stage: string },
  ) {
    return this.service.updateStage(
      id,
      body,
      req.user?.id,
      req.user?.email,
      req,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật dự án/đơn hàng' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { name?: string; customerId?: string; address?: string; note?: string; deadline?: string },
  ) {
    return this.service.update(
      id,
      body,
      req.user?.id,
      req.user?.email,
    );
  }

  @Put(':id/discount')
  @ApiOperation({ summary: 'Cập nhật chiết khấu cho đơn hàng' })
  async updateDiscount(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { discountAmount: number },
  ) {
    return this.service.updateDiscount(
      id,
      body.discountAmount,
      req.user?.id,
      req.user?.email,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa dự án/đơn hàng (soft delete)' })
  async delete(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.service.delete(
      id,
      req.user?.id,
      req.user?.email,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin dự án' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/acceptance')
  @ApiOperation({ summary: 'Lấy dữ liệu nghiệm thu đơn hàng' })
  async getAcceptance(@Param('id') id: string) {
    return this.service.getAcceptance(id);
  }

  @Put(':id/acceptance')
  @ApiOperation({ summary: 'Lưu/cập nhật dữ liệu nghiệm thu đơn hàng' })
  async saveAcceptance(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      items: {
        orderItemId: string;
        acceptedQty: number;
        unitPrice?: number | null;
        note?: string;
      }[]
    },
  ) {
    return this.service.saveAcceptance(
      id,
      body.items,
    );
  }
}
