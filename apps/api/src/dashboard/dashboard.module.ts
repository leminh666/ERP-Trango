import { Module }from '@nestjs/common';
import { DashboardController }from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { WorkshopJobsModule }from '../workshop-jobs/workshop-jobs.module';

@Module({
  imports: [WorkshopJobsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}

