import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomerFollowUpsService } from './customer-followups.service';
import { CustomersController } from './customers.controller';
import { FollowUpsController } from './followups.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [CustomersController, FollowUpsController],
  providers: [CustomersService, CustomerFollowUpsService],
  exports: [CustomersService, CustomerFollowUpsService],
})
export class CustomersModule {}
