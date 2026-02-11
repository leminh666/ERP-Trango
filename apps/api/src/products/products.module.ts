import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductAttributesController } from './product-attributes.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ProductsController, ProductAttributesController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
