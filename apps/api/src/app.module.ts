import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { WorkshopsModule } from './workshops/workshops.module';
import { RemindersModule } from './reminders/reminders.module';
import { IncomeCategoriesModule } from './income-categories/income-categories.module';
import { ExpenseCategoriesModule } from './expense-categories/expense-categories.module';
import { ProductsModule } from './products/products.module';
import { WalletsModule } from './wallets/wallets.module';
import { FilesModule } from './files/files.module';
import { TransactionsModule } from './transactions/transactions.module';
import { ProjectsModule } from './projects/projects.module';
import { OrderItemsModule } from './order-items/order-items.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { AiModule } from './ai/ai.module';
import { AuditModule } from './audit/audit.module';
import { TransfersModule } from './transfers/transfers.module';
import { AdjustmentsModule } from './adjustments/adjustments.module';
import { CashflowModule } from './cashflow/cashflow.module';
import { WorkshopJobsModule } from './workshop-jobs/workshop-jobs.module';
import { CrmModule } from './crm/crm.module';

@Module({
  imports: [
    // ConfigModule - Load env from apps/api/.env ONLY
    // Use absolute path to ensure correct loading regardless of working directory
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '..', '.env')],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    SuppliersModule,
    WorkshopsModule,
    RemindersModule,
    IncomeCategoriesModule,
    ExpenseCategoriesModule,
    ProductsModule,
    WalletsModule,
    FilesModule,
    TransactionsModule,
    ProjectsModule,
    OrderItemsModule,
    DashboardModule,
    ReportsModule,
    SettingsModule,
    AiModule,
    AuditModule,
    TransfersModule,
    AdjustmentsModule,
    CashflowModule,
    WorkshopJobsModule,
    CrmModule,
  ],
})
export class AppModule {}
