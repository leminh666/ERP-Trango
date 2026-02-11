import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CustomerFollowUpsService } from './customer-followups.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(
    private customersService: CustomersService,
    private followUpsService: CustomerFollowUpsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách khách hàng' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'region', required: false })
  @ApiQuery({ name: 'ownerUserId', required: false })
  @ApiQuery({ name: 'hasNextFollowUp', required: false, type: Boolean })
  @ApiQuery({ name: 'overdueFollowUp', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Danh sách khách hàng' })
  async findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('region') region?: string,
    @Query('ownerUserId') ownerUserId?: string,
    @Query('hasNextFollowUp') hasNextFollowUp?: string,
    @Query('overdueFollowUp') overdueFollowUp?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.customersService.findAll({
      search,
      status,
      region,
      ownerUserId,
      hasNextFollowUp: hasNextFollowUp === 'true' ? true : undefined,
      overdueFollowUp: overdueFollowUp === 'true' ? true : undefined,
      includeDeleted: includeDeleted === 'true',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin khách hàng' })
  @ApiResponse({ status: 200, description: 'Thông tin khách hàng' })
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo khách hàng mới' })
  @ApiResponse({ status: 201, description: 'Khách hàng đã được tạo' })
  async create(
    @Body() data: {
      name: string;
      phone?: string;
      address?: string;
      region?: string;
      city?: string;
      district?: string;
      tags?: string;
      note?: string;
      ownerUserId?: string;
    },
    @Request() req?: { user: { id: string; email?: string } },
  ) {
    return this.customersService.create(data as any, req?.user?.id, req?.user?.email);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật khách hàng' })
  @ApiResponse({ status: 200, description: 'Khách hàng đã được cập nhật' })
  async update(
    @Param('id') id: string,
    @Body() data: {
      name?: string;
      phone?: string;
      address?: string;
      region?: string;
      city?: string;
      district?: string;
      status?: string;
      lostReason?: string;
      tags?: string;
      note?: string;
      ownerUserId?: string;
    },
    @Request() req?: { user: { id: string; email?: string } },
  ) {
    return this.customersService.update(id, data as any, req?.user?.id, req?.user?.email);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa khách hàng (soft delete)' })
  @ApiResponse({ status: 200, description: 'Khách hàng đã được xóa' })
  async delete(
    @Param('id') id: string,
    @Request() req?: { user: { id: string; email?: string } },
  ) {
    return this.customersService.delete(id, req?.user?.id, req?.user?.email);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Khôi phục khách hàng đã xóa' })
  @ApiResponse({ status: 200, description: 'Khách hàng đã được khôi phục' })
  async restore(
    @Param('id') id: string,
    @Request() req?: { user: { id: string; email?: string } },
  ) {
    return this.customersService.restore(id, req?.user?.id, req?.user?.email);
  }

  // Follow-ups endpoints
  @Get(':id/followups')
  @ApiOperation({ summary: 'Lấy danh sách lịch hẹn của khách hàng' })
  async getFollowUps(@Param('id') id: string) {
    return this.followUpsService.findByCustomer(id);
  }

  @Post(':id/followups')
  @ApiOperation({ summary: 'Tạo lịch hẹn mới' })
  async createFollowUp(
    @Param('id') id: string,
    @Body() data: {
      type: string;
      scheduledAt: string; // ISO date string
      outcomeNote?: string;
    },
    @Request() req: { user: { id: string } },
  ) {
    return this.followUpsService.create({
      customerId: id,
      type: data.type,
      scheduledAt: new Date(data.scheduledAt),
      outcomeNote: data.outcomeNote,
      createdByUserId: req.user.id,
    });
  }
}
