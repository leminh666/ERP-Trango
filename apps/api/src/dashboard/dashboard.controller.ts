import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Lấy dữ liệu dashboard' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  async getDashboardData(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.service.getDashboardData(from, to);
  }
}

