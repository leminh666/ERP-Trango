import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiService, ParseTransactionDto } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private service: AiService) {}

  @Post('parse-transaction')
  @ApiOperation({ summary: 'Parse voice transcript to transaction draft' })
  async parseTransaction(@Body() dto: ParseTransactionDto) {
    return this.service.parseTransaction(dto);
  }
}

