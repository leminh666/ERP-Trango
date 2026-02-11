#!/usr/bin/env node

/**
 * Wallet Reconciliation Tool
 * 
 * Usage: node scripts/reconciliation.js --walletId=<id> [--from=<date>] [--to=<date>]
 * 
 * Example:
 *   node scripts/reconciliation.js --walletId=123e4567-e89b-12d3-a456-426614174000
 *   node scripts/reconciliation.js --walletId=123 --from=2024-01-01 --to=2024-12-31
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function reconcile(walletId, from, to) {
  console.log('='.repeat(60));
  console.log('WALLET RECONCILIATION REPORT');
  console.log('='.repeat(60));
  console.log(`Wallet ID: ${walletId}`);
  console.log(`Period: ${from || 'All time'} to ${to || 'Now'}`);
  console.log('');

  const wallet = await prisma.wallet.findUnique({
    where: { id: walletId },
    select: { id: true, name: true, code: true }
  });

  if (!wallet) {
    console.error('ERROR: Wallet not found!');
    process.exit(1);
  }

  console.log(`Wallet: ${wallet.code} - ${wallet.name}`);
  console.log('');

  const startDate = from ? new Date(from) : new Date(0);
  const endDate = to ? new Date(to) : new Date();

  // 1. INCOME Analysis
  console.log('-'.repeat(60));
  console.log('1. INCOME TRANSACTIONS');
  console.log('-'.repeat(60));

  const incomes = await prisma.transaction.findMany({
    where: {
      walletId,
      type: 'INCOME',
      deletedAt: null,
      date: { gte: startDate, lte: endDate },
    },
    include: { incomeCategory: true, project: true },
    orderBy: { date: 'desc' }
  });

  const incomeTotal = incomes.reduce((sum, tx) => sum + Number(tx.amount), 0);
  console.log(`Total INCOME: ${incomeTotal.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}`);
  console.log(`Record count: ${incomes.length}`);
  console.log('Records:', incomes.map(tx => ({
    id: tx.id,
    code: tx.code,
    date: tx.date.toISOString().split('T')[0],
    amount: Number(tx.amount),
    category: tx.incomeCategory?.name || 'N/A',
    project: tx.project?.name || 'N/A'
  })));
  console.log('');

  // 2. EXPENSE Analysis
  console.log('-'.repeat(60));
  console.log('2. EXPENSE TRANSACTIONS');
  console.log('-'.repeat(60));

  const expenses = await prisma.transaction.findMany({
    where: {
      walletId,
      type: 'EXPENSE',
      deletedAt: null,
      date: { gte: startDate, lte: endDate },
    },
    include: { expenseCategory: true, project: true },
    orderBy: { date: 'desc' }
  });

  const expenseTotal = expenses.reduce((sum, tx) => sum + Number(tx.amount), 0);
  console.log(`Total EXPENSE: ${expenseTotal.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}`);
  console.log(`Record count: ${expenses.length}`);
  console.log('Records:', expenses.map(tx => ({
    id: tx.id,
    code: tx.code,
    date: tx.date.toISOString().split('T')[0],
    amount: Number(tx.amount),
    category: tx.expenseCategory?.name || 'N/A',
    project: tx.project?.name || 'N/A'
  })));
  console.log('');

  // 3. TRANSFER Analysis
  console.log('-'.repeat(60));
  console.log('3. TRANSFER TRANSACTIONS');
  console.log('-'.repeat(60));

  const transfers = await prisma.transaction.findMany({
    where: {
      OR: [
        { walletId },
        { walletToId: walletId },
      ],
      type: 'TRANSFER',
      deletedAt: null,
      date: { gte: startDate, lte: endDate },
    },
    include: { wallet: true, walletTo: true },
    orderBy: { date: 'desc' }
  });

  const transferOut = transfers.filter(tx => tx.walletId === walletId);
  const transferIn = transfers.filter(tx => tx.walletToId === walletId);
  const transferOutTotal = transferOut.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const transferInTotal = transferIn.reduce((sum, tx) => sum + Number(tx.amount), 0);

  console.log(`Total TRANSFER OUT: ${transferOutTotal.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}`);
  console.log(`Total TRANSFER IN: ${transferInTotal.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}`);
  console.log(`Record count: ${transfers.length}`);
  console.log('(Note: Transfers do NOT affect Income/Expense totals)');
  console.log('');

  // 4. ADJUSTMENT Analysis
  console.log('-'.repeat(60));
  console.log('4. ADJUSTMENTS');
  console.log('-'.repeat(60));

  const adjustments = await prisma.walletAdjustment.findMany({
    where: {
      walletId,
      deletedAt: null,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'desc' }
  });

  const adjustmentTotal = adjustments.reduce((sum, adj) => sum + Number(adj.amount), 0);
  console.log(`Total ADJUSTMENTS: ${adjustmentTotal.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}`);
  console.log(`Record count: ${adjustments.length}`);
  console.log('Records:', adjustments.map(adj => ({
    id: adj.id,
    date: adj.date.toISOString().split('T')[0],
    amount: Number(adj.amount),
    note: adj.note || 'N/A'
  })));
  console.log('');

  // 5. SUMMARY
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  const net = incomeTotal - expenseTotal + adjustmentTotal;
  console.log(`Income Total:      ${incomeTotal.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}`);
  console.log(`Expense Total:     ${expenseTotal.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}`);
  console.log(`Adjustments Total: ${adjustmentTotal.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}`);
  console.log(`─`.repeat(30));
  console.log(`NET (Final):      ${net.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}`);
  console.log('');

  // 6. Warnings
  console.log('='.repeat(60));
  console.log('WARNINGS / ORPHANS');
  console.log('='.repeat(60));

  // Check for transactions with no wallet
  const txsWithoutWallet = await prisma.transaction.findMany({
    where: {
      walletId,
      deletedAt: null,
    },
    select: { walletId: true }
  });
  
  const orphanedWallets = await prisma.wallet.findMany({
    where: {
      id: { in: txsWithoutWallet.map(tx => tx.walletId) },
      deletedAt: { not: null }
    }
  });

  if (orphanedWallets.length > 0) {
    console.log('⚠️  WARNING: Transactions reference soft-deleted wallets:');
    orphanedWallets.forEach(w => console.log(`   - ${w.code} (deletedAt: ${w.deletedAt})`));
  } else {
    console.log('✅ No orphaned transactions found');
  }

  // Check for adjustments with no wallet
  const orphanedAdjustments = await prisma.walletAdjustment.findMany({
    where: {
      walletId,
      deletedAt: { not: null }
    }
  });

  if (orphanedAdjustments.length > 0) {
    console.log('⚠️  WARNING: Soft-deleted adjustments found (should be excluded from KPIs):');
    orphanedAdjustments.forEach(a => console.log(`   - ${a.id} (amount: ${a.amount}, deletedAt: ${a.deletedAt})`));
  } else {
    console.log('✅ No soft-deleted adjustments in range');
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('RECONCILIATION COMPLETE');
  console.log('='.repeat(60));
}

// Parse command line arguments
const args = process.argv.slice(2);
const walletIdArg = args.find(a => a.startsWith('--walletId='));
const fromArg = args.find(a => a.startsWith('--from='));
const toArg = args.find(a => a.startsWith('--to='));

if (!walletIdArg) {
  console.error('ERROR: --walletId is required');
  console.error('Usage: node scripts/reconciliation.js --walletId=<id> [--from=<date>] [--to=<date>]');
  process.exit(1);
}

const walletId = walletIdArg.split('=')[1];
const from = fromArg ? fromArg.split('=')[1] : null;
const to = toArg ? toArg.split('=')[1] : null;

reconcile(walletId, from, to)
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

