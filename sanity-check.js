/**
 * Sanity Check Script - Verify Report Data
 * Run this to check if the database has correct data for reports
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(60));
  console.log('🔍 SANITY CHECK - REPORT DATA VERIFICATION');
  console.log('='.repeat(60));

  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

  console.log(`\n📅 Date Range: ${startOfYear.toISOString()} to ${endOfYear.toISOString()}`);

  // 1. Check Categories
  console.log('\n--- 1. CATEGORIES ---');
  const incomeCategories = await prisma.incomeCategory.findMany({ where: { deletedAt: null } });
  const expenseCategories = await prisma.expenseCategory.findMany({ where: { deletedAt: null } });
  
  console.log(`✅ Income Categories: ${incomeCategories.length}`);
  incomeCategories.forEach(c => console.log(`   - ${c.code}: ${c.name}`));
  
  console.log(`✅ Expense Categories: ${expenseCategories.length}`);
  expenseCategories.forEach(c => console.log(`   - ${c.code}: ${c.name}`));

  // 2. Check Transactions
  console.log('\n--- 2. TRANSACTIONS ---');
  const allTransactions = await prisma.transaction.findMany({
    where: {
      deletedAt: null,
      date: { gte: startOfYear, lte: endOfYear },
    },
    include: {
      incomeCategory: true,
      expenseCategory: true,
      project: { include: { customer: true } },
    },
  });

  console.log(`✅ Total transactions in ${currentYear}: ${allTransactions.length}`);

  const incomeTx = allTransactions.filter(t => t.type === 'INCOME');
  const expenseTx = allTransactions.filter(t => t.type === 'EXPENSE');
  const transferTx = allTransactions.filter(t => t.type === 'TRANSFER');

  console.log(`   - INCOME: ${incomeTx.length} transactions`);
  console.log(`   - EXPENSE: ${expenseTx.length} transactions`);
  console.log(`   - TRANSFER: ${transferTx.length} transactions`);

  // Calculate totals
  const incomeTotal = incomeTx.reduce((sum, t) => sum + Number(t.amount), 0);
  const expenseTotal = expenseTx.reduce((sum, t) => sum + Number(t.amount), 0);
  
  console.log(`\n💰 INCOME Total: ${incomeTotal.toLocaleString('vi-VN')} VND`);
  console.log(`💸 EXPENSE Total: ${expenseTotal.toLocaleString('vi-VN')} VND`);
  console.log(`📈 PROFIT (L1): ${(incomeTotal - expenseTotal).toLocaleString('vi-VN')} VND`);

  // Check if categories are assigned
  const incomeWithCategory = incomeTx.filter(t => t.incomeCategoryId !== null).length;
  const expenseWithCategory = expenseTx.filter(t => t.expenseCategoryId !== null).length;

  console.log(`\n📊 Category Assignment:`);
  console.log(`   - INCOME with category: ${incomeWithCategory}/${incomeTx.length}`);
  console.log(`   - EXPENSE with category: ${expenseWithCategory}/${expenseTx.length}`);

  // 3. Check Daily Series for Dashboard
  console.log('\n--- 3. DAILY SERIES (Dashboard) ---');
  const dailyData = new Map();
  
  for (const tx of allTransactions) {
    if (tx.type === 'TRANSFER') continue;
    const dateKey = tx.date.toISOString().split('T')[0];
    const existing = dailyData.get(dateKey) || { revenue: 0, expense: 0 };
    
    if (tx.type === 'INCOME') {
      existing.revenue += Number(tx.amount);
    } else if (tx.type === 'EXPENSE') {
      existing.expense += Number(tx.amount);
    }
    dailyData.set(dateKey, existing);
  }

  console.log(`✅ Days with transactions: ${dailyData.size}`);
  if (dailyData.size > 0) {
    console.log('   Sample days:');
    Array.from(dailyData.entries()).slice(0, 5).forEach(([date, data]) => {
      console.log(`   - ${date}: Revenue=${data.revenue.toLocaleString()}, Expense=${data.expense.toLocaleString()}`);
    });
  }

  // 4. Check Expense Breakdown (Direct vs Common)
  console.log('\n--- 4. EXPENSE BREAKDOWN ---');
  const directExpense = expenseTx.filter(t => !t.isCommonCost);
  const commonExpense = expenseTx.filter(t => t.isCommonCost);

  console.log(`✅ Direct Expenses (project-linked): ${directExpense.length} transactions`);
  console.log(`   Total: ${directExpense.reduce((s, t) => s + Number(t.amount), 0).toLocaleString('vi-VN')} VND`);
  
  console.log(`✅ Common Expenses (overhead): ${commonExpense.length} transactions`);
  console.log(`   Total: ${commonExpense.reduce((s, t) => s + Number(t.amount), 0).toLocaleString('vi-VN')} VND`);

  // 5. Check Customers & Regions
  console.log('\n--- 5. CUSTOMERS & REGIONS ---');
  const customers = await prisma.customer.findMany({
    where: { deletedAt: null },
    include: { projects: true },
  });

  console.log(`✅ Total customers: ${customers.length}`);
  
  const customersByRegion = new Map();
  customers.forEach(c => {
    if (c.region) {
      customersByRegion.set(c.region, (customersByRegion.get(c.region) || 0) + 1);
    }
  });

  console.log(`✅ Customers with region: ${customersByRegion.size} regions`);
  Array.from(customersByRegion.entries()).forEach(([region, count]) => {
    console.log(`   - ${region}: ${count} customers`);
  });

  // 6. Check Projects
  console.log('\n--- 6. PROJECTS ---');
  const projects = await prisma.project.findMany({
    where: { deletedAt: null },
    include: {
      customer: true,
      transactions: {
        where: {
          deletedAt: null,
          date: { gte: startOfYear, lte: endOfYear },
        },
      },
    },
  });

  console.log(`✅ Total projects: ${projects.length}`);
  const wonProjects = projects.filter(p => p.stage === 'WON');
  console.log(`   - WON projects: ${wonProjects.length}`);

  // 7. Check Region-based Revenue
  console.log('\n--- 7. REVENUE BY REGION ---');
  const regionStats = new Map();
  
  // Initialize with customer counts
  customers.forEach(c => {
    if (c.region) {
      const existing = regionStats.get(c.region) || { revenue: 0, expense: 0, orderCount: 0, customerCount: 0 };
      existing.customerCount += 1;
      regionStats.set(c.region, existing);
    }
  });

  // Aggregate project metrics by region
  for (const project of projects) {
    const region = project.customer?.region || 'Chưa xác định';
    const stats = regionStats.get(region) || {
      revenue: 0,
      expense: 0,
      orderCount: 0,
      customerCount: 0,
    };
    
    stats.orderCount++;
    
    for (const tx of project.transactions) {
      const amount = Number(tx.amount);
      if (tx.type === 'INCOME') {
        stats.revenue += amount;
      } else if (tx.type === 'EXPENSE' && !tx.isCommonCost) {
        stats.expense += amount;
      }
    }
    
    regionStats.set(region, stats);
  }

  console.log(`✅ Regions with data: ${regionStats.size}`);
  Array.from(regionStats.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .forEach(([region, stats]) => {
      console.log(`   - ${region}: Revenue=${stats.revenue.toLocaleString()} VND, Orders=${stats.orderCount}, Customers=${stats.customerCount}`);
    });

  // 8. Final Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY');
  console.log('='.repeat(60));
  
  const hasData = incomeTotal > 0 || expenseTotal > 0 || customers.length > 0;
  
  if (hasData) {
    console.log('✅ DATA AVAILABLE FOR REPORTS');
    console.log(`   - Dashboard: ${dailyData.size > 0 ? 'HAS DATA' : 'NO DATA'}`);
    console.log(`   - Expense Report: ${expenseTx.length > 0 ? 'HAS DATA' : 'NO DATA'}`);
    console.log(`   - Customer Regions: ${regionStats.size > 0 ? 'HAS DATA' : 'NO DATA'}`);
    console.log(`   - Total Income: ${incomeTotal.toLocaleString('vi-VN')} VND`);
    console.log(`   - Total Expense: ${expenseTotal.toLocaleString('vi-VN')} VND`);
    console.log(`   - Profit L1: ${(incomeTotal - expenseTotal).toLocaleString('vi-VN')} VND`);
  } else {
    console.log('❌ NO DATA AVAILABLE - Seed may have failed');
  }

  console.log('\n' + '='.repeat(60));
}

main()
  .catch(e => {
    console.error('❌ Sanity check failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
