/**
 * Mark & Cleanup Script - Đánh dấu và xoá dữ liệu mẫu (sample data)
 *
 * Vì dữ liệu mẫu đã tồn tại trong DB trước khi thêm cột isSample,
 * script này sẽ:
 * 1. Đánh dấu (UPDATE) dữ liệu mẫu hiện có với isSample = true
 * 2. Xoá (DELETE) tất cả dữ liệu được đánh dấu
 *
 * Dữ liệu mẫu được nhận diện bằng pattern code:
 * - Customers: KH0001 - KH0008
 * - Suppliers: NCC001 - NCC008
 * - Workshops: XU01 - XU03
 * - Projects: DH001 - DH008
 * - WorkshopJobs: PGC0001 - PGC0009
 * - Transactions: PT0001-PC0008 (INCOME/EXPENSE)
 */

import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load .env
const apiDir = path.resolve(__dirname, '..');
const apiEnvPath = path.resolve(apiDir, '.env');

if (fs.existsSync(apiEnvPath)) {
  dotenv.config({ path: apiEnvPath });
  console.log('✅ Loaded env from apps/api/.env');
} else {
  console.error('❌ ERROR: apps/api/.env not found!');
}

const prisma = new PrismaClient();

async function markAndCleanupSampleData() {
  console.log('🚀 Starting Mark & Cleanup of sample data...\n');

  const results: Record<string, { marked: number; deleted: number }> = {};

  try {
    // === Step 1: Mark & Delete Transactions ===
    console.log('📝 Step 1: Mark & Delete sample Transactions (Phiếu thu/chi)...');
    // Find all PT and PC codes with 4 digits
    const txs = await prisma.transaction.findMany({
      where: {
        OR: [
          { code: { startsWith: 'PT', mode: 'insensitive' } },
          { code: { startsWith: 'PC', mode: 'insensitive' } },
        ],
        isSample: false,
      },
      select: { id: true, code: true },
    });
    // Filter by pattern (exactly 4 digits after prefix)
    const sampleTxs = txs.filter(tx =>
      (tx.code.startsWith('PT') && /^PT\d{4}$/.test(tx.code)) ||
      (tx.code.startsWith('PC') && /^PC\d{4}$/.test(tx.code))
    );
    if (sampleTxs.length > 0) {
      await prisma.transaction.updateMany({
        where: { id: { in: sampleTxs.map(t => t.id) } },
        data: { isSample: true },
      });
      const deleted = await prisma.transaction.deleteMany({
        where: { id: { in: sampleTxs.map(t => t.id) } },
      });
      results['Transactions (Phiếu thu/chi)'] = { marked: sampleTxs.length, deleted: deleted.count };
      console.log(`   ✅ Marked ${sampleTxs.length}, Deleted ${deleted.count} transactions\n`);
    } else {
      results['Transactions (Phiếu thu/chi)'] = { marked: 0, deleted: 0 };
      console.log(`   ℹ️  No sample transactions found\n`);
    }

    // === Step 2: Mark & Delete WorkshopJobItems ===
    console.log('📝 Step 2: Mark & Delete sample WorkshopJobItems...');
    // Get jobs first to find their items
    const sampleJobIds = [
      'PGC0001', 'PGC0002', 'PGC0003', 'PGC0004', 'PGC0005',
      'PGC0006', 'PGC0007', 'PGC0008', 'PGC0009'
    ];
    const jobs = await prisma.workshopJob.findMany({
      where: { code: { in: sampleJobIds } },
      select: { id: true },
    });
    if (jobs.length > 0) {
      const jobIds = jobs.map(j => j.id);
      await prisma.workshopJobItem.updateMany({
        where: { workshopJobId: { in: jobIds } },
        data: { isSample: true },
      });
      const deleted = await prisma.workshopJobItem.deleteMany({
        where: { workshopJobId: { in: jobIds } },
      });
      results['WorkshopJobItems'] = { marked: jobs.length, deleted: deleted.count };
      console.log(`   ✅ Marked ${jobs.length} job items, Deleted ${deleted.count}\n`);
    } else {
      results['WorkshopJobItems'] = { marked: 0, deleted: 0 };
      console.log(`   ℹ️  No sample workshop jobs found\n`);
    }

    // === Step 3: Mark & Delete WorkshopJobs ===
    console.log('📝 Step 3: Mark & Delete sample WorkshopJobs (Phiếu gia công)...');
    if (sampleJobIds.length > 0) {
      // First delete WorkshopJobItems (they cascade but let's be explicit)
      console.log(`   🔍 Deleting WorkshopJobItems first...`);
      await prisma.workshopJobItem.deleteMany({
        where: { workshopJob: { code: { in: sampleJobIds } } },
      });

      // Now delete the jobs
      await prisma.workshopJob.updateMany({
        where: { code: { in: sampleJobIds } },
        data: { isSample: true },
      });
      const deleted = await prisma.workshopJob.deleteMany({
        where: { code: { in: sampleJobIds } },
      });
      results['WorkshopJobs (Phiếu gia công)'] = { marked: sampleJobIds.length, deleted: deleted.count };
      console.log(`   ✅ Marked ${sampleJobIds.length}, Deleted ${deleted.count} workshop jobs\n`);
    } else {
      results['WorkshopJobs (Phiếu gia công)'] = { marked: 0, deleted: 0 };
      console.log(`   ℹ️  No sample workshop jobs found\n`);
    }

    // === Step 4: Mark & Delete OrderItems ===
    console.log('📝 Step 4: Mark & Delete sample OrderItems...');
    const sampleProjectCodes = ['DH001', 'DH002', 'DH003', 'DH004', 'DH005', 'DH006', 'DH007', 'DH008'];
    const projects = await prisma.project.findMany({
      where: { code: { in: sampleProjectCodes } },
      select: { id: true },
    });
    if (projects.length > 0) {
      const projectIds = projects.map(p => p.id);

      // Delete OrderItems first
      console.log(`   🔍 Deleting OrderItems first...`);
      await prisma.orderItem.deleteMany({
        where: { projectId: { in: projectIds } },
      });

      await prisma.project.updateMany({
        where: { code: { in: sampleProjectCodes } },
        data: { isSample: true },
      });
      const deleted = await prisma.project.deleteMany({
        where: { code: { in: sampleProjectCodes } },
      });
      results['OrderItems'] = { marked: projects.length, deleted: 0 }; // Items deleted above
      console.log(`   ✅ Deleted OrderItems, Marked ${projects.length}, Deleted ${deleted.count} projects\n`);
    } else {
      results['OrderItems'] = { marked: 0, deleted: 0 };
      console.log(`   ℹ️  No sample projects found\n`);
    }

    // === Step 6: Mark & Delete CustomerFollowUps ===
    console.log('📝 Step 6: Mark & Delete sample CustomerFollowUps...');
    const sampleCustomerCodes = [
      'KH0001', 'KH0002', 'KH0003', 'KH0004', 'KH0005',
      'KH0006', 'KH0007', 'KH0008'
    ];
    const customers = await prisma.customer.findMany({
      where: { code: { in: sampleCustomerCodes } },
      select: { id: true },
    });
    if (customers.length > 0) {
      const customerIds = customers.map(c => c.id);

      // Delete FollowUps first (they cascade but let's be explicit)
      console.log(`   🔍 Deleting CustomerFollowUps first...`);
      await prisma.customerFollowUp.deleteMany({
        where: { customerId: { in: customerIds } },
      });

      await prisma.customer.updateMany({
        where: { code: { in: sampleCustomerCodes } },
        data: { isSample: true },
      });
      const deleted = await prisma.customer.deleteMany({
        where: { code: { in: sampleCustomerCodes } },
      });
      results['CustomerFollowUps'] = { marked: customers.length, deleted: 0 };
      console.log(`   ✅ Deleted FollowUps, Marked ${customers.length}, Deleted ${deleted.count} customers\n`);
    } else {
      results['CustomerFollowUps'] = { marked: 0, deleted: 0 };
      console.log(`   ℹ️  No sample customers found\n`);
    }

    // === Step 8: Mark & Delete Suppliers ===
    console.log('📝 Step 8: Mark & Delete sample Suppliers (Nhà cung cấp)...');
    const sampleSupplierCodes = [
      'NCC001', 'NCC002', 'NCC003', 'NCC004',
      'NCC005', 'NCC006', 'NCC007', 'NCC008'
    ];
    if (sampleSupplierCodes.length > 0) {
      await prisma.supplier.updateMany({
        where: { code: { in: sampleSupplierCodes } },
        data: { isSample: true },
      });
      const deleted = await prisma.supplier.deleteMany({
        where: { code: { in: sampleSupplierCodes } },
      });
      results['Suppliers (Nhà cung cấp)'] = { marked: sampleSupplierCodes.length, deleted: deleted.count };
      console.log(`   ✅ Marked ${sampleSupplierCodes.length}, Deleted ${deleted.count} suppliers\n`);
    } else {
      results['Suppliers (Nhà cung cấp)'] = { marked: 0, deleted: 0 };
      console.log(`   ℹ️  No sample suppliers found\n`);
    }

    // === Step 9: Mark & Delete Workshops ===
    console.log('📝 Step 9: Mark & Delete sample Workshops (Xưởng gia công)...');
    const sampleWorkshopCodes = ['XU01', 'XU02', 'XU03'];
    const workshopsToDelete = await prisma.workshop.findMany({
      where: { code: { in: sampleWorkshopCodes } },
      select: { id: true, code: true },
    });

    if (workshopsToDelete.length > 0) {
      const workshopIds = workshopsToDelete.map(w => w.id);

      // First, delete any remaining WorkshopJobs that reference these workshops
      // (Some might have isSample: false and weren't deleted in Step 3)
      console.log(`   🔍 Checking for remaining WorkshopJobs referencing these workshops...`);
      const remainingJobs = await prisma.workshopJob.findMany({
        where: { workshopId: { in: workshopIds } },
        select: { id: true, code: true },
      });

      if (remainingJobs.length > 0) {
        console.log(`   ⚠️  Found ${remainingJobs.length} remaining WorkshopJobs, deleting...`);
        // Mark and delete these jobs first
        await prisma.workshopJob.updateMany({
          where: { id: { in: remainingJobs.map(j => j.id) } },
          data: { isSample: true },
        });
        const deletedRemJobs = await prisma.workshopJob.deleteMany({
          where: { id: { in: remainingJobs.map(j => j.id) } },
        });
        console.log(`   ✅ Deleted ${deletedRemJobs.count} remaining workshop jobs`);
      }

      // Also need to delete WorkshopJobItems for these jobs
      const remainingJobItemIds = await prisma.workshopJobItem.findMany({
        where: { workshopJob: { workshopId: { in: workshopIds } } },
        select: { id: true },
      });
      if (remainingJobItemIds.length > 0) {
        const deletedRemItems = await prisma.workshopJobItem.deleteMany({
          where: { id: { in: remainingJobItemIds.map(i => i.id) } },
        });
        console.log(`   ✅ Deleted ${deletedRemItems.count} remaining workshop job items`);
      }

      // Now delete the workshops
      await prisma.workshop.updateMany({
        where: { code: { in: sampleWorkshopCodes } },
        data: { isSample: true },
      });
      const deleted = await prisma.workshop.deleteMany({
        where: { code: { in: sampleWorkshopCodes } },
      });
      results['Workshops (Xưởng gia công)'] = { marked: workshopsToDelete.length, deleted: deleted.count };
      console.log(`   ✅ Marked ${workshopsToDelete.length}, Deleted ${deleted.count} workshops\n`);
    } else {
      results['Workshops (Xưởng gia công)'] = { marked: 0, deleted: 0 };
      console.log(`   ℹ️  No sample workshops found\n`);
    }

    // === Summary ===
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 MARK & CLEANUP COMPLETED!');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📊 Summary of processed records:\n');
    let totalMarked = 0;
    let totalDeleted = 0;
    for (const [table, data] of Object.entries(results)) {
      console.log(`   ${table}:`);
      console.log(`      Marked: ${data.marked}`);
      console.log(`      Deleted: ${data.deleted}`);
      totalMarked += data.marked;
      totalDeleted += data.deleted;
    }
    console.log(`\n   TOTAL MARKED: ${totalMarked}`);
    console.log(`   TOTAL DELETED: ${totalDeleted}\n`);

    console.log('📋 Modules that retain sample data (NOT deleted):');
    console.log('   • Users (admin@demo.com, staff@demo.com)');
    console.log('   • System Settings');
    console.log('   • Wallets (TIENMAT, NGANHANG, KHAC)');
    console.log('   • Income Categories');
    console.log('   • Expense Categories');
    console.log('   • Products (Catalog)');
    console.log('   • Transfers (CK0001-CK0006)');
    console.log('   • Wallet Adjustments');
    console.log('   • Audit Logs\n');

    return results;
  } catch (error) {
    console.error('❌ Mark & Cleanup failed:', error);
    throw error;
  }
}

// Run
markAndCleanupSampleData()
  .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

