import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CashflowService } from './cashflow.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('cashflow')
@UseGuards(JwtAuthGuard)
export class CashflowController {
  constructor(private readonly cashflowService: CashflowService) {}

  @Get()
  async getCashflowReport(@Query() query: { from?: string; to?: string; walletId?: string }) {
    return this.cashflowService.getCashflowReport(query);
  }
}

