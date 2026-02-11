/**
 * Cleanup Script - Xoá dữ liệu mẫu (sample data)
 *
 * Mục tiêu: Xoá toàn bộ dữ liệu mẫu được đánh dấu isSample: true
 * Các module bị ảnh hưởng:
 * 1. Danh sách đơn (Projects + OrderItems)
 * 2. Pipeline (Projects - same as order list)
 * 3. Phiếu thu/chi (Transactions INCOME/EXPENSE)
 * 4. Phiếu gia công (WorkshopJobs + WorkshopJobItems + Transactions related)
 * 5. Khách hàng (Customers + CustomerFollowUps)
 * 6. Nhà cung cấp (Suppliers)
 * 7. Xưởng gia công (Workshops)
 *
 * Lưu ý: KHÔNG xoá Users, Settings, Wallets, Categories, Products
 */

import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load .env before creating PrismaClient
const apiDir = path.resolve(__dirname, '..');
const apiEnvPath = path.resolve(apiDir, '.env');

if (fs.existsSync(apiEnvPath)) {
  dotenv.config({ path: apiEnvPath });
  console.log('✅ Loaded env from apps/api/.env');
} else {
  console.error('❌ ERROR: apps/api/.env not found!');
}

const prisma = new PrismaClient();

async function cleanupSampleData() {
  console.log('🧹 Starting cleanup of sample data...\n');

  const results: Record<string, number> = {};

  try {
    // === Step 1: Delete Transactions (INCOME/EXPENSE) ===
    // Must delete before WorkshopJobs since they reference workshopJobId
    console.log('📝 Step 1: Deleting sample Transactions (Phiếu thu/chi)...');
    const txResult = await prisma.transaction.deleteMany({
      where: { isSample: true },
    });
    results['Transactions (Phiếu thu/chi)'] = txResult.count;
    console.log(`   ✅ Deleted ${txResult.count} transactions\n`);

    // === Step 2: Delete WorkshopJobItems ===
    // Items are cascade-deleted when WorkshopJob is deleted, but let's be explicit
    console.log('📝 Step 2: Deleting sample WorkshopJobItems...');
    const jobItemsResult = await prisma.workshopJobItem.deleteMany({
      where: { isSample: true },
    });
    results['WorkshopJobItems (Sản phẩm trong phiếu GC)'] = jobItemsResult.count;
    console.log(`   ✅ Deleted ${jobItemsResult.count} workshop job items\n`);

    // === Step 3: Delete WorkshopJobs ===
    // Must delete before Projects since they reference projectId
    console.log('📝 Step 3: Deleting sample WorkshopJobs (Phiếu gia công)...');
    const jobsResult = await prisma.workshopJob.deleteMany({
      where: { isSample: true },
    });
    results['WorkshopJobs (Phiếu gia công)'] = jobsResult.count;
    console.log(`   ✅ Deleted ${jobsResult.count} workshop jobs\n`);

    // === Step 4: Delete OrderItems ===
    // Items are cascade-deleted when Project is deleted, but let's be explicit
    console.log('📝 Step 4: Deleting sample OrderItems...');
    const orderItemsResult = await prisma.orderItem.deleteMany({
      where: { isSample: true },
    });
    results['OrderItems (Sản phẩm trong đơn)'] = orderItemsResult.count;
    console.log(`   ✅ Deleted ${orderItemsResult.count} order items\n`);

    // === Step 5: Delete Projects ===
    // Must delete after WorkshopJobs since WorkshopJobs reference projectId
    console.log('📝 Step 5: Deleting sample Projects (Danh sách đơn/Pipeline)...');
    const projectsResult = await prisma.project.deleteMany({
      where: { isSample: true },
    });
    results['Projects (Danh sách đơn/Pipeline)'] = projectsResult.count;
    console.log(`   ✅ Deleted ${projectsResult.count} projects\n`);

    // === Step 6: Delete CustomerFollowUps ===
    // Follow-ups cascade from Customers, but let's be explicit
    console.log('📝 Step 6: Deleting sample CustomerFollowUps...');
    const followUpsResult = await prisma.customerFollowUp.deleteMany({
      where: { isSample: true },
    });
    results['CustomerFollowUps (Lịch sử follow-up)'] = followUpsResult.count;
    console.log(`   ✅ Deleted ${followUpsResult.count} customer follow-ups\n`);

    // === Step 7: Delete Customers ===
    // Must delete after Projects since Projects reference customerId
    console.log('📝 Step 7: Deleting sample Customers (Khách hàng)...');
    const customersResult = await prisma.customer.deleteMany({
      where: { isSample: true },
    });
    results['Customers (Khách hàng)'] = customersResult.count;
    console.log(`   ✅ Deleted ${customersResult.count} customers\n`);

    // === Step 8: Delete Suppliers ===
    console.log('📝 Step 8: Deleting sample Suppliers (Nhà cung cấp)...');
    const suppliersResult = await prisma.supplier.deleteMany({
      where: { isSample: true },
    });
    results['Suppliers (Nhà cung cấp)'] = suppliersResult.count;
    console.log(`   ✅ Deleted ${suppliersResult.count} suppliers\n`);

    // === Step 9: Delete Workshops ===
    // Must delete after Projects since Projects reference workshopId
    console.log('📝 Step 9: Deleting sample Workshops (Xưởng gia công)...');
    const workshopsResult = await prisma.workshop.deleteMany({
      where: { isSample: true },
    });
    results['Workshops (Xưởng gia công)'] = workshopsResult.count;
    console.log(`   ✅ Deleted ${workshopsResult.count} workshops\n`);

    // === Summary ===
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 CLEANUP COMPLETED!');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📊 Summary of deleted records:\n');
    let total = 0;
    for (const [table, count] of Object.entries(results)) {
      console.log(`   ${table}: ${count} records`);
      total += count;
    }
    console.log(`\n   TOTAL: ${total} records deleted\n`);

    console.log('📋 Modules that retain sample data (NOT deleted):');
    console.log('   • Users (admin@demo.com, staff@demo.com)');
    console.log('   • System Settings');
    console.log('   • Wallets (TIENMAT, NGANHANG, KHAC)');
    console.log('   • Income Categories');
    console.log('   • Expense Categories');
    console.log('   • Products (Catalog)');
    console.log('   • Transfers');
    console.log('   • Wallet Adjustments');
    console.log('   • Audit Logs\n');

    return results;
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

// Run cleanup
cleanupSampleData()
  .then(() => {
    console.log('✅ Cleanup script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Cleanup script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

