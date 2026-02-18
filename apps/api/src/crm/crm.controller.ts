import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CrmService } from './crm.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CrmStage, CrmActivityType, FollowUpStatus, Priority } from '@prisma/client';

@ApiTags('crm')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crm')
export class CrmController {
  constructor(private crmService: CrmService) {}

  // ========== CUSTOMERS ==========

  @Get('customers')
  @ApiOperation({ summary: 'Lấy danh sách khách hàng CRM' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'stage', required: false })
  @ApiQuery({ name: 'ownerUserId', required: false })
  @ApiQuery({ name: 'source', required: false })
  @ApiQuery({ name: 'includeOverdue', required: false, type: Boolean })
  async findAllCustomers(
    @Query('search') search?: string,
    @Query('stage') stage?: string,
    @Query('ownerUserId') ownerUserId?: string,
    @Query('source') source?: string,
    @Query('includeOverdue') includeOverdue?: string,
    @Request() req?: { user: { id: string; role?: string } },
  ) {
    return this.crmService.findAllCrmCustomers({
      search,
      stage: stage as CrmStage,
      ownerUserId,
      source,
      includeOverdue: includeOverdue === 'true',
      userId: req?.user?.id,
      userRole: req?.user?.role,
    });
  }

  @Get('customers/:customerId')
  @ApiOperation({ summary: 'Lấy chi tiết khách hàng CRM' })
  async findOneCustomer(
    @Param('customerId') customerId: string,
    @Request() req?: { user: { id: string; role?: string } },
  ) {
    return this.crmService.findOneCrmCustomer(
      customerId,
      req?.user?.id,
      req?.user?.role,
    );
  }

  @Post('customers/:customerId')
  @ApiOperation({ summary: 'Tạo CRM record cho khách hàng' })
  async createCrmCustomer(
    @Param('customerId') customerId: string,
    @Body() data: {
      ownerUserId?: string;
      source?: string;
      sourceNote?: string;
    },
  ) {
    return this.crmService.createCrmCustomer({
      customerId,
      ...data,
    });
  }

  @Put('customers/:customerId')
  @ApiOperation({ summary: 'Cập nhật thông tin CRM khách hàng' })
  async updateCrmCustomer(
    @Param('customerId') customerId: string,
    @Body() data: {
      stage?: CrmStage;
      area?: string;
      layout?: string;
      style?: string;
      architectureType?: string;
      briefNote?: string;
      ownerUserId?: string;
      nextFollowUpAt?: string;
      nextFollowUpNote?: string;
    },
    @Request() req: { user: { id: string } },
  ) {
    return this.crmService.updateCrmCustomer(
      customerId,
      data,
      req.user.id,
    );
  }

  // ========== ACTIVITIES ==========

  @Post('customers/:customerId/activities')
  @ApiOperation({ summary: 'Tạo hoạt động chăm sóc khách hàng' })
  async createActivity(
    @Param('customerId') customerId: string,
    @Body() data: {
      type: CrmActivityType;
      outcome?: string;
      note?: string;
      nextFollowUpAt?: string;
      nextFollowUpNote?: string;
      priority?: Priority;
    },
    @Request() req: { user: { id: string } },
  ) {
    return this.crmService.createActivity({
      customerId,
      userId: req.user.id,
      ...data,
      nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : undefined,
    });
  }

  @Put('activities/:activityId')
  @ApiOperation({ summary: 'Cập nhật trạng thái hoạt động' })
  async updateActivity(
    @Param('activityId') activityId: string,
    @Body() data: {
      followUpStatus?: FollowUpStatus;
      outcome?: string;
      note?: string;
    },
  ) {
    return this.crmService.updateActivity(activityId, data);
  }

  @Get('customers/:customerId/activities')
  @ApiOperation({ summary: 'Lấy lịch sử hoạt động của khách hàng' })
  async getActivities(
    @Param('customerId') customerId: string,
    @Request() req?: { user: { id: string; role?: string } },
  ) {
    return this.crmService.getCustomerActivities(
      customerId,
      req?.user?.id,
      req?.user?.role,
    );
  }

  // ========== SCHEDULE ==========

  @Get('schedule')
  @ApiOperation({ summary: 'Lấy lịch hẹn chăm sóc khách hàng' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'ownerUserId', required: false })
  async getSchedule(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('ownerUserId') ownerUserId?: string,
    @Request() req?: { user: { id: string; role?: string } },
  ) {
    return this.crmService.getSchedule({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      ownerUserId,
      userId: req?.user?.id,
      userRole: req?.user?.role,
    });
  }

  // ========== REPORTS ==========

  @Get('reports')
  @ApiOperation({ summary: 'Lấy báo cáo CRM' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'ownerUserId', required: false })
  @ApiQuery({ name: 'source', required: false })
  async getReport(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('ownerUserId') ownerUserId?: string,
    @Query('source') source?: string,
    @Request() req?: { user: { id: string; role?: string } },
  ) {
    return this.crmService.getReport({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      ownerUserId,
      source,
      userId: req?.user?.id,
      userRole: req?.user?.role,
    });
  }
}

