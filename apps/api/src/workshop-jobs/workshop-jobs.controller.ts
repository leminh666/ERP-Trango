import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  WorkshopJobsService,
  WorkshopJobCreateDto,
  WorkshopJobUpdateDto,
  WorkshopJobPayDto,
} from './workshop-jobs.service';

@Controller('workshop-jobs')
@UseGuards(JwtAuthGuard)
export class WorkshopJobsController {
  constructor(private readonly workshopJobsService: WorkshopJobsService) {}

  private isAdmin(req: any): boolean {
    return req.user?.role === 'ADMIN';
  }

  @Get()
  async findAll(@Request() req: any, @Query() query: any) {
    const { from, to, search, status, workshopId, projectId, includeDeleted } = query;

    return this.workshopJobsService.findAll({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      search: search || undefined,
      status: (status as any) || undefined,
      workshopId: workshopId || undefined,
      projectId: projectId || undefined,
      includeDeleted: includeDeleted === 'true' && this.isAdmin(req),
    });
  }

  @Get('summary')
  async summary(@Query() query: any) {
    const { from, to, status, workshopId, projectId } = query;

    return this.workshopJobsService.summary({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      status: (status as any) || undefined,
      workshopId: workshopId || undefined,
      projectId: projectId || undefined,
      includeDeleted: false,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.workshopJobsService.findOne(id);
  }

  @Get(':id/items')
  async getItems(@Param('id') id: string) {
    const job = await this.workshopJobsService.findOne(id);
    return job.items || [];
  }

  @Get(':id/payments')
  async getPayments(@Param('id') id: string) {
    return this.workshopJobsService.getPayments(id);
  }

  // === Workshop Job Items ===
  @Put(':id/items/:itemId')
  @ApiOperation({ summary: 'Cập nhật một hạng mục trong phiếu gia công' })
  async updateItem(
    @Request() req: any,
    @Param('id') jobId: string,
    @Param('itemId') itemId: string,
    @Body() body: { quantity?: number; unitPrice?: number; productName?: string; unit?: string; note?: string },
  ) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Chỉ ADMIN được thực hiện thao tác này' };
    }
    return this.workshopJobsService.updateItem(
      jobId,
      itemId,
      body,
      req.user?.id,
      req.user?.email,
    );
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Xóa một hạng mục trong phiếu gia công' })
  async deleteItem(
    @Request() req: any,
    @Param('id') jobId: string,
    @Param('itemId') itemId: string,
  ) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Chỉ ADMIN được thực hiện thao tác này' };
    }
    return this.workshopJobsService.deleteItem(
      jobId,
      itemId,
      req.user?.id,
      req.user?.email,
    );
  }

  // === Batch Update Items (for SL mapping) ===
  @Put(':id/items')
  @ApiOperation({ summary: 'Cập nhật hàng loạt SL cho các hạng mục trong phiếu gia công' })
  async updateItems(
    @Request() req: any,
    @Param('id') jobId: string,
    @Body() body: { items: Array<{ id: string; quantity: number; unitPrice?: number }> },
  ) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Chỉ ADMIN được thực hiện thao tác này' };
    }
    return this.workshopJobsService.updateItems(
      jobId,
      body.items,
      req.user?.id,
      req.user?.email,
    );
  }

  @Post()
  async create(@Request() req: any, @Body() body: WorkshopJobCreateDto) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Chỉ ADMIN được thực hiện thao tác này' };
    }

    return this.workshopJobsService.create(
      body,
      req.user?.id,
      req.user?.email,
    );
  }

  @Put(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: WorkshopJobUpdateDto,
  ) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Chỉ ADMIN được thực hiện thao tác này' };
    }

    return this.workshopJobsService.update(
      id,
      body,
      req.user?.id,
      req.user?.email,
    );
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Chỉ ADMIN được thực hiện thao tác này' };
    }

    return this.workshopJobsService.delete(
      id,
      req.user?.id,
      req.user?.email,
    );
  }

  @Post(':id/restore')
  async restore(@Request() req: any, @Param('id') id: string) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Chỉ ADMIN được thực hiện thao tác này' };
    }

    return this.workshopJobsService.restore(
      id,
      req.user?.id,
      req.user?.email,
    );
  }

  @Post(':id/pay')
  async pay(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: WorkshopJobPayDto,
  ) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Chỉ ADMIN được thực hiện thao tác này' };
    }

    return this.workshopJobsService.pay(
      id,
      {
        ...body,
        date: new Date(body.date),
      },
      req.user?.id,
      req.user?.email,
    );
  }

  @Patch(':id/payments/:expenseId')
  async updatePayment(
    @Request() req: any,
    @Param('id') id: string,
    @Param('expenseId') expenseId: string,
    @Body() body: { amount?: number; walletId?: string; expenseCategoryId?: string; date?: string; note?: string },
  ) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Chỉ ADMIN được thực hiện thao tác này' };
    }

    return this.workshopJobsService.updatePayment(
      id,
      expenseId,
      body,
      req.user?.id,
      req.user?.email,
    );
  }

  @Delete(':id/payments/:expenseId')
  async deletePayment(
    @Request() req: any,
    @Param('id') id: string,
    @Param('expenseId') expenseId: string,
  ) {
    if (!this.isAdmin(req)) {
      return { error: 'Forbidden', message: 'Chỉ ADMIN được thực hiện thao tác này' };
    }

    return this.workshopJobsService.deletePayment(
      id,
      expenseId,
      req.user?.id,
      req.user?.email,
    );
  }
}

