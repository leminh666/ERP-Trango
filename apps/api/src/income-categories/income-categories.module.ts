import { Module } from '@nestjs/common';
import { IncomeCategoriesService } from './income-categories.service';
import { IncomeCategoriesController } from './income-categories.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [IncomeCategoriesController],
  providers: [IncomeCategoriesService],
  exports: [IncomeCategoriesService],
})
export class IncomeCategoriesModule {}
