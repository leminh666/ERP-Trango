import { Module } from '@nestjs/common';
import { WorkshopJobsService } from './workshop-jobs.service';
import { WorkshopJobsController } from './workshop-jobs.controller';
import { AuditModule } from '../audit/audit.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [AuditModule, TransactionsModule],
  controllers: [WorkshopJobsController],
  providers: [WorkshopJobsService],
  exports: [WorkshopJobsService],
})
export class WorkshopJobsModule {}

