/**
 * Verify remaining data after cleanup
 */
import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

const apiDir = path.resolve(__dirname, '..');
const apiEnvPath = path.resolve(apiDir, '.env');

if (fs.existsSync(apiEnvPath)) {
  dotenv.config({ path: apiEnvPath });
}

const prisma = new PrismaClient();

async function verify() {
  console.log('🔍 Verifying remaining data...\n');

  // Check sample data in detail
  const customers = await prisma.customer.findMany({
    where: { code: { startsWith: 'KH' } },
    select: { code: true, name: true, deletedAt: true, isSample: true }
  });
  console.log('📊 Customers (KH*):');
  customers.forEach(c => console.log(`   ${c.code}: ${c.name} (deletedAt: ${c.deletedAt}, isSample: ${c.isSample})`));

  const projects = await prisma.project.findMany({
    where: { code: { startsWith: 'DH' } },
    select: { code: true, name: true, deletedAt: true, isSample: true }
  });
  console.log('\n📊 Projects (DH*):');
  projects.forEach(p => console.log(`   ${p.code}: ${p.name} (deletedAt: ${p.deletedAt}, isSample: ${p.isSample})`));

  const workshops = await prisma.workshop.findMany({
    where: { code: { startsWith: 'XU' } },
    select: { code: true, name: true, deletedAt: true, isSample: true }
  });
  console.log('\n📊 Workshops (XU*):');
  workshops.forEach(w => console.log(`   ${w.code}: ${w.name} (deletedAt: ${w.deletedAt}, isSample: ${w.isSample})`));

  const workshopJobs = await prisma.workshopJob.findMany({
    where: { code: { startsWith: 'PGC' } },
    select: { code: true, title: true, deletedAt: true, isSample: true }
  });
  console.log('\n📊 WorkshopJobs (PGC*):');
  workshopJobs.forEach(j => console.log(`   ${j.code}: ${j.title} (deletedAt: ${j.deletedAt}, isSample: ${j.isSample})`));

  const suppliers = await prisma.supplier.findMany({
    where: { code: { startsWith: 'NCC' } },
    select: { code: true, name: true, deletedAt: true, isSample: true }
  });
  console.log('\n📊 Suppliers (NCC*):');
  suppliers.forEach(s => console.log(`   ${s.code}: ${s.name} (deletedAt: ${s.deletedAt}, isSample: ${s.isSample})`));

  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [
        { code: { startsWith: 'PT' } },
        { code: { startsWith: 'PC' } },
      ]
    },
    select: { code: true, type: true, deletedAt: true, isSample: true }
  });
  console.log('\n📊 Transactions (PT*/PC*):');
  console.log(`   Total: ${transactions.length}`);
  transactions.forEach(t => console.log(`   ${t.code}: ${t.type} (deletedAt: ${t.deletedAt}, isSample: ${t.isSample})`));
}

verify().catch(console.error).finally(() => prisma.$disconnect());
