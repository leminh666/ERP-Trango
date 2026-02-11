import { Controller, Get, Put, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerFollowUpsService } from './customer-followups.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('customer-followups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('followups')
export class FollowUpsController {
  constructor(private followUpsService: CustomerFollowUpsService) {}

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật lịch hẹn' })
  async update(
    @Param('id') id: string,
    @Body() data: { outcomeNote?: string },
  ) {
    return this.followUpsService.update(id, data as any);
  }

  @Post(':id/mark-done')
  @ApiOperation({ summary: 'Đánh dấu lịch hẹn đã hoàn thành' })
  async markDone(
    @Param('id') id: string,
    @Body() data: { outcomeNote?: string },
  ) {
    return this.followUpsService.markDone(id, data.outcomeNote);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Hủy lịch hẹn' })
  async cancel(
    @Param('id') id: string,
    @Body() data: { outcomeNote?: string },
  ) {
    return this.followUpsService.cancel(id, data.outcomeNote);
  }
}
