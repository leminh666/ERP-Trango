import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('income-summary')
  @ApiOperation({ summary: 'Báo cáo thu theo danh mục' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'walletId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  async getIncomeSummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('walletId') walletId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.service.getIncomeSummary({ from, to, walletId, projectId });
  }

  @Get('expense-summary')
  @ApiOperation({ summary: 'Báo cáo chi theo danh mục' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'walletId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'isCommonCost', required: false, type: Boolean })
  async getExpenseSummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('walletId') walletId?: string,
    @Query('projectId') projectId?: string,
    @Query('isCommonCost') isCommonCost?: string,
  ) {
    return this.service.getExpenseSummary({
      from,
      to,
      walletId,
      projectId,
      isCommonCost: isCommonCost === 'true' ? true : isCommonCost === 'false' ? false : undefined,
    });
  }

  @Get('customer-regions')
  @ApiOperation({ summary: 'Báo cáo theo khu vực khách hàng' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'stage', required: false })
  async getCustomerRegionsReport(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('stage') stage?: string,
  ) {
    return this.service.getCustomerRegionsReport({ from, to, stage });
  }

  @Get('sales-channels')
  @ApiOperation({ summary: 'Báo cáo theo kênh bán hàng' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'stage', required: false })
  async getSalesChannelsReport(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('stage') stage?: string,
  ) {
    return this.service.getSalesChannelsReport({ from, to, stage });
  }
}

