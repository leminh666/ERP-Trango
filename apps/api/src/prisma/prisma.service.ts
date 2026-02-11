import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // Debug: Check DATABASE_URL exists before connecting
    const dbUrl = process.env.DATABASE_URL;
    console.log('🔍 [Prisma] DATABASE_URL:', dbUrl ? `loaded (${dbUrl.substring(0, 50)}...)` : 'NOT LOADED!');
    
    if (!dbUrl) {
      console.error('❌ [Prisma] CRITICAL: DATABASE_URL is not set! Cannot connect to database.');
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    console.log('✅ [Prisma] Connecting to database...');
    await this.$connect();
    console.log('✅ [Prisma] Connected successfully to PostgreSQL');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

