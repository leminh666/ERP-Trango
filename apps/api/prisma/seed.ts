import { PrismaClient, WalletType, SourceChannel, CustomerStatus } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load .env before creating PrismaClient
// IMPORTANT: Only load from apps/api/.env - DO NOT load from root .env
const apiDir = path.resolve(__dirname, '..'); // apps/api
const apiEnvPath = path.resolve(apiDir, '.env');

// Only load from apps/api/.env
if (fs.existsSync(apiEnvPath)) {
  dotenv.config({ path: apiEnvPath });
  console.log('✅ Loaded env from apps/api/.env');
} else {
  console.error('❌ ERROR: apps/api/.env not found!');
}

console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':***@') : 'NOT SET');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // === PHASE 1: Seed Users ===
  const adminPassword = '$2a$10$iFQpyFPqImlFKz0JWexakurKCM7ARhpBFw10aA0EcOipdpNYvQ5ly'; // bcrypt hash of "123456"

  await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: { password: adminPassword, role: 'ADMIN', name: 'Quản trị viên', isActive: true, deletedAt: null },
    create: { email: 'admin@demo.com', password: adminPassword, role: 'ADMIN', name: 'Quản trị viên', isActive: true, deletedAt: null },
  });
  console.log('✅ Created admin user');

  await prisma.user.upsert({
    where: { email: 'staff@demo.com' },
    update: { password: adminPassword, role: 'STAFF', name: 'Nhân viên', isActive: true, deletedAt: null },
    create: { email: 'staff@demo.com', password: adminPassword, role: 'STAFF', name: 'Nhân viên', isActive: true, deletedAt: null },
  });
  console.log('✅ Created staff user');

  // === PHASE 2: Seed System Settings ===
  const settings = [
    { key: 'company_name', valueJson: JSON.stringify('TRẦN GỖ HOÀNG GIA'), description: 'Tên công ty' },
    { key: 'company_phone', valueJson: JSON.stringify('028 1234 5678'), description: 'Số điện thoại' },
    { key: 'company_address', valueJson: JSON.stringify('123 Đường Lê Lợi, Quận 1, TP.HCM'), description: 'Địa chỉ' },
  ];
  for (const s of settings) {
    await prisma.systemSetting.upsert({ where: { key: s.key }, update: {}, create: s });
  }
  console.log('✅ Created system settings');

  // === PHASE 3: Seed Wallets ===
  const wallets = [
    { code: 'TIENMAT', name: 'Tiền mặt', type: WalletType.CASH },
    { code: 'NGANHANG', name: 'Ngân hàng', type: WalletType.BANK },
    { code: 'KHAC', name: 'Ví khác', type: WalletType.OTHER },
  ];
  for (const w of wallets) {
    await prisma.wallet.upsert({
      where: { code: w.code },
      update: {},
      create: { ...w, visualType: 'ICON', iconKey: 'wallet', isActive: true, deletedAt: null },
    });
  }
  console.log(`✅ Created ${wallets.length} wallets`);

  // === PHASE 4: Seed Customers ===
  const customers = [
    { name: 'Nguyễn Văn A', phone: '0901234567', address: '123 Lê Lợi, Q1, TP.HCM', region: 'HCM', status: CustomerStatus.WON, sourceChannel: SourceChannel.FACEBOOK },
    { name: 'Trần Thị B', phone: '0912345678', address: '456 Nguyễn Huệ, Q1, TP.HCM', region: 'HCM', status: CustomerStatus.WON, sourceChannel: SourceChannel.WEBSITE },
    { name: 'Lê Văn C', phone: '0923456789', address: '789 Điện Biên Phủ, Q.Bình Thạnh', region: 'HCM', status: CustomerStatus.WON, sourceChannel: SourceChannel.TIKTOK },
    { name: 'Phạm Thị D', phone: '0934567890', address: '321 Võ Văn Ngân, Q.Thủ Đức', region: 'HCM', status: CustomerStatus.WON, sourceChannel: SourceChannel.ZALO },
    { name: 'Hoàng Văn E', phone: '0945678901', address: '654 Quang Trung, Q.Gò Vấp', region: 'HCM', status: CustomerStatus.WON, sourceChannel: SourceChannel.INTRODUCED },
    { name: 'Ngô Thị F', phone: '0956789012', address: '987 CMT8, Q.3, TP.HCM', region: 'HCM', status: CustomerStatus.WON, sourceChannel: SourceChannel.FACEBOOK },
    { name: 'Đinh Văn G', phone: '0967890123', address: '147 Hai Bà Trưng, Q.1, TP.HCM', region: 'HCM', status: CustomerStatus.WON, sourceChannel: SourceChannel.WALK_IN },
    { name: 'Bùi Thị H', phone: '0978901234', address: '258 Lý Thường Kiệt, Q.10, TP.HCM', region: 'HCM', status: CustomerStatus.WON, sourceChannel: SourceChannel.REFERRAL },
  ];

  let customerCode = 1;
  for (const c of customers) {
    const code = `KH${String(customerCode).padStart(4, '0')}`;
    await prisma.customer.upsert({
      where: { code },
      update: {},
      create: { code, ...c, visualType: 'ICON', iconKey: 'user', isSample: true },
    });
    customerCode++;
  }
  console.log(`✅ Created ${customers.length} customers`);

  // === PHASE 5: Seed Workshops ===
  const workshops = [
    { code: 'XU01', name: 'Xưởng Gỗ Mộc Phước', phone: '0911111111', address: '123 Đường 5, Q.Gò Vấp, TP.HCM' },
    { code: 'XU02', name: 'Xưởng Đồ Gỗ Thành Đạt', phone: '0922222222', address: '456 Đường 10, Q.Thủ Đức, TP.HCM' },
    { code: 'XU03', name: 'Xưởng Sản Xuất Gỗ Hoàng Gia', phone: '0933333333', address: '789 Đường 3/2, Q.10, TP.HCM' },
  ];

  for (const w of workshops) {
    await prisma.workshop.upsert({
      where: { code: w.code },
      update: {},
      create: { ...w, visualType: 'ICON', iconKey: 'factory', isActive: true, isSample: true, deletedAt: null },
    });
  }
  console.log(`✅ Created ${workshops.length} workshops`);

  // === PHASE 6: Seed Projects ===
  const projects = [
    { code: 'DH001', name: 'Dự án Biệt thự Minh Châu', stage: 'WON' },
    { code: 'DH002', name: 'Căn hộ Rivera Park', stage: 'WON' },
    { code: 'DH003', name: 'Nhà phố Q.7', stage: 'WON' },
    { code: 'DH004', name: 'Văn phòng Glow', stage: 'WON' },
    { code: 'DH005', name: 'Biệt thự Đồ Sơn', stage: 'WON' },
    { code: 'DH006', name: 'Quán cafe Wood Style', stage: 'WON' },
    { code: 'DH007', name: 'Showroom Nội thất', stage: 'WON' },
    { code: 'DH008', name: 'Căn hộ TP. Thủ Đức', stage: 'WON' },
  ];

  const allCustomers = await prisma.customer.findMany();
  const allWorkshops = await prisma.workshop.findMany();

  let projectCode = 1;
  for (const p of projects) {
    await prisma.project.upsert({
      where: { code: p.code },
      update: {},
      create: {
        code: p.code,
        name: p.name,
        customerId: allCustomers[projectCode - 1]?.id || null,
        workshopId: allWorkshops[(projectCode - 1) % allWorkshops.length].id,
        stage: p.stage,
        status: 'ACTIVE',
        isActive: true,
        isSample: true,
        deletedAt: null,
      },
    });
    projectCode++;
  }
  console.log(`✅ Created ${projects.length} projects`);

  // === PHASE 7: Seed WorkshopJobs ===
  const workshopJobs = [
    { title: 'Làm cửa gỗ óc chó', projectCode: 'DH001', workshopCode: 'XU01', amount: 45000000, status: 'DONE', startDate: '2026-01-10', dueDate: '2026-01-25', paidAmount: 45000000 },
    { title: 'Bộ bàn ăn 6 ghế', projectCode: 'DH002', workshopCode: 'XU02', amount: 28000000, status: 'IN_PROGRESS', startDate: '2026-01-15', dueDate: '2026-01-30', paidAmount: 14000000 },
    { title: 'Tủ bếp gỗ sồi', projectCode: 'DH003', workshopCode: 'XU03', amount: 35000000, status: 'SENT', startDate: '2026-01-08', dueDate: '2026-01-22', paidAmount: 35000000 },
    { title: 'Sofa gỗ phòng khách', projectCode: 'DH004', workshopCode: 'XU01', amount: 22000000, status: 'IN_PROGRESS', startDate: '2026-01-18', dueDate: '2026-01-28', paidAmount: 0 },
    { title: 'Kệ sách gỗ tự nhiên', projectCode: 'DH005', workshopCode: 'XU02', amount: 18000000, status: 'DRAFT', startDate: '2026-01-20', dueDate: '2026-02-05', paidAmount: 0 },
    { title: 'Cửa sổ gỗ cao cấp', projectCode: 'DH006', workshopCode: 'XU03', amount: 32000000, status: 'DONE', startDate: '2025-12-15', dueDate: '2026-01-05', paidAmount: 32000000 },
    { title: 'Phòng ngủ trẻ em', projectCode: 'DH007', workshopCode: 'XU01', amount: 25000000, status: 'DONE', startDate: '2025-12-20', dueDate: '2026-01-10', paidAmount: 25000000 },
    { title: 'Bàn làm việc giám đốc', projectCode: 'DH008', workshopCode: 'XU02', amount: 38000000, status: 'CANCELLED', startDate: '2025-11-25', dueDate: '2025-12-20', paidAmount: 5000000 },
    { title: 'Tủ rượu gỗ sồi', projectCode: 'DH001', workshopCode: 'XU03', amount: 55000000, status: 'SENT', startDate: '2025-11-10', dueDate: '2025-12-30', paidAmount: 55000000 },
  ];

  const workshopMap: Record<string, string> = {};
  allWorkshops.forEach(w => workshopMap[w.code] = w.id);

  let jobCode = 1;
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const allProjects = await prisma.project.findMany();
  
  for (const job of workshopJobs) {
    const code = `PGC${String(jobCode).padStart(4, '0')}`;
    const project = allProjects.find(p => p.code === job.projectCode);
    
    if (project) {
      await prisma.workshopJob.upsert({
        where: { code },
        update: {},
        create: {
          code,
          projectId: project.id,
          workshopId: workshopMap[job.workshopCode],
          title: job.title,
          amount: job.amount,
          paidAmount: job.paidAmount,
          status: job.status as any,
          startDate: new Date(job.startDate),
          dueDate: new Date(job.dueDate),
          createdByUserId: adminUser?.id,
          isSample: true,
        },
      });
    }
    jobCode++;
  }
  console.log(`✅ Created ${workshopJobs.length} workshop jobs`);

  // === PHASE 8: Seed Categories FIRST (before transactions) ===
  await seedCategories();
  console.log('✅ Created categories');

  // === PHASE 9: Seed Transactions ===
  // allProjects and adminUser already available from Phase 7
  const allWallets = await prisma.wallet.findMany();
  const allIncomeCategories = await prisma.incomeCategory.findMany();
  const allExpenseCategories = await prisma.expenseCategory.findMany();

  const transactions = [
    // Income transactions
    { type: 'INCOME', code: 'PT0001', date: '2026-01-10', amount: 15000000, note: 'Đặt cọc thi công biệt thự', walletId: 0, categoryId: 0, projectId: 0 },
    { type: 'INCOME', code: 'PT0002', date: '2026-01-12', amount: 25000000, note: 'Thanh toán đợt 1', walletId: 1, categoryId: 0, projectId: 1 },
    { type: 'INCOME', code: 'PT0003', date: '2026-01-15', amount: 8000000, note: 'Thu hồi công nợ', walletId: 0, categoryId: 2, projectId: null },
    { type: 'INCOME', code: 'PT0004', date: '2026-01-18', amount: 30000000, note: 'Doanh thu bán hàng nội thất', walletId: 1, categoryId: 0, projectId: 2 },
    { type: 'INCOME', code: 'PT0005', date: '2026-01-20', amount: 12000000, note: 'Thanh toán đơn hàng Q.7', walletId: 0, categoryId: 0, projectId: 2 },
    // Expense transactions
    { type: 'EXPENSE', code: 'PC0001', date: '2026-01-11', amount: 5000000, note: 'Mua gỗ óc chó', walletId: 0, categoryId: 0, projectId: 0, isCommonCost: false },
    { type: 'EXPENSE', code: 'PC0002', date: '2026-01-13', amount: 3000000, note: 'Chi phí vận chuyển', walletId: 0, categoryId: 3, projectId: 0, isCommonCost: true },
    { type: 'EXPENSE', code: 'PC0003', date: '2026-01-15', amount: 8000000, note: 'Tiền công thợ mộc', walletId: 1, categoryId: 1, projectId: 0, isCommonCost: false },
    { type: 'EXPENSE', code: 'PC0004', date: '2026-01-16', amount: 2000000, note: 'Điện nước xưởng', walletId: 0, categoryId: 4, projectId: null, isCommonCost: true },
    { type: 'EXPENSE', code: 'PC0005', date: '2026-01-19', amount: 1500000, note: 'Marketing facebook', walletId: 1, categoryId: 5, projectId: null, isCommonCost: true },
    { type: 'EXPENSE', code: 'PC0006', date: '2026-01-20', amount: 6000000, note: 'Mua phụ kiện cửa', walletId: 0, categoryId: 0, projectId: 0, isCommonCost: false },
    { type: 'EXPENSE', code: 'PC0007', date: '2026-01-22', amount: 4000000, note: 'Chi phí khác', walletId: 0, categoryId: 6, projectId: null, isCommonCost: true },
    { type: 'EXPENSE', code: 'PC0008', date: '2026-01-25', amount: 2500000, note: 'Thuê xưởng tháng 1', walletId: 1, categoryId: 2, projectId: null, isCommonCost: true },
  ];

  let txCode = 1;
  for (const tx of transactions) {
    const code = `${tx.type === 'INCOME' ? 'PT' : 'PC'}${String(txCode).padStart(4, '0')}`;
    const wallet = allWallets[tx.walletId % allWallets.length];
    const category = tx.type === 'INCOME' 
      ? allIncomeCategories[tx.categoryId % allIncomeCategories.length]
      : allExpenseCategories[tx.categoryId % allExpenseCategories.length];
    
    await prisma.transaction.upsert({
      where: { code },
      update: {},
      create: {
        code,
        type: tx.type as any,
        date: new Date(tx.date),
        amount: tx.amount,
        note: tx.note,
        walletId: wallet.id,
        incomeCategoryId: tx.type === 'INCOME' ? category.id : null,
        expenseCategoryId: tx.type === 'EXPENSE' ? category.id : null,
        projectId: tx.projectId !== undefined && tx.projectId !== null ? allProjects[tx.projectId % allProjects.length].id : null,
        isCommonCost: tx.isCommonCost || false,
        createdByUserId: adminUser?.id,
        isSample: true,
      },
    });
    txCode++;
  }
  console.log(`✅ Created ${transactions.length} transactions`);

  // === PHASE 10: Seed Transfers ===
  const transfers = [
    { date: '2026-01-12', amount: 10000000, fromWalletIdx: 0, toWalletIdx: 1, note: 'Chuyển tiền vào ngân hàng' },
    { date: '2026-01-15', amount: 5000000, fromWalletIdx: 1, toWalletIdx: 0, note: 'Rút tiền mặt từ ATM' },
    { date: '2026-01-18', amount: 8000000, fromWalletIdx: 0, toWalletIdx: 1, note: 'Nộp tiền vào tài khoản' },
    { date: '2026-01-20', amount: 3000000, fromWalletIdx: 1, toWalletIdx: 0, note: 'Rút tiền mặt chi phí' },
    { date: '2026-01-22', amount: 15000000, fromWalletIdx: 0, toWalletIdx: 1, note: 'Chuyển tiền dự phòng' },
    { date: '2026-01-25', amount: 6000000, fromWalletIdx: 1, toWalletIdx: 0, note: 'Rút tiền thanh toán' },
  ];

  let transferCode = 1;
  for (const tf of transfers) {
    const code = `CK${String(transferCode).padStart(4, '0')}`;
    const fromWallet = allWallets[tf.fromWalletIdx % allWallets.length];
    const toWallet = allWallets[tf.toWalletIdx % allWallets.length];

    await prisma.transaction.upsert({
      where: { code },
      update: {},
      create: {
        code,
        type: 'TRANSFER',
        date: new Date(tf.date),
        amount: tf.amount,
        note: tf.note,
        walletId: fromWallet.id,
        walletToId: toWallet.id,
        feeAmount: 0,
        createdByUserId: adminUser!.id,
      },
    });
    transferCode++;
  }
  console.log(`✅ Created ${transfers.length} transfers`);

  // === PHASE 11: Seed Adjustments ===
  const adjustments = [
    { date: '2026-01-10', amount: 5000000, walletIdx: 0, note: 'Điều chỉnh tăng số dư đầu kỳ' },
    { date: '2026-01-14', amount: -2000000, walletIdx: 1, note: 'Phí ngân hàng tháng 12' },
    { date: '2026-01-20', amount: 3000000, walletIdx: 0, note: 'Tiền lãi được cộng' },
    { date: '2026-01-25', amount: -1500000, walletIdx: 2, note: 'Phí dịch vụ' },
  ];

  for (let i = 0; i < adjustments.length; i++) {
    const adj = adjustments[i];
    const wallet = allWallets[adj.walletIdx % allWallets.length];
    
    await prisma.walletAdjustment.create({
      data: {
        date: new Date(adj.date),
        amount: adj.amount,
        note: adj.note,
        walletId: wallet.id,
        createdByUserId: adminUser!.id,
      },
    });
  }
  console.log(`✅ Created ${adjustments.length} adjustments`);

  // === PHASE 13: Seed Products (Catalog) ===
  await seedProducts();
  console.log('✅ Created products');

  // === PHASE 14: Seed Suppliers ===
  await seedSuppliers();
  console.log('✅ Created suppliers');

  // === PHASE 15: Seed Audit Logs ===
  const auditLogs = [
    { entity: 'Transaction', entityId: 'tx-001', action: 'CREATE' },
    { entity: 'Transaction', entityId: 'tx-002', action: 'CREATE' },
    { entity: 'Transaction', entityId: 'tx-003', action: 'CREATE' },
    { entity: 'Project', entityId: 'proj-DH001', action: 'CREATE' },
    { entity: 'Customer', entityId: 'cust-KH0001', action: 'CREATE' },
    { entity: 'Wallet', entityId: 'wallet-001', action: 'UPDATE' },
    { entity: 'Transaction', entityId: 'tx-004', action: 'UPDATE' },
    { entity: 'WorkshopJob', entityId: 'job-PGC0001', action: 'CREATE' },
  ];

  for (const log of auditLogs) {
    await prisma.auditLog.create({
      data: {
        entity: log.entity,
        entityId: log.entityId,
        action: log.action,
        byUserId: adminUser!.id,
        byUserEmail: adminUser!.email,
        ip: '127.0.0.1',
      },
    });
  }
  console.log(`✅ Created ${auditLogs.length} audit logs`);

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

async function seedCategories() {
  // Income Categories
  const incomeCategories = [
    { code: 'DT01', name: 'Doanh thu bán hàng', iconKey: 'trending-up', color: '#22c55e' },
    { code: 'DT02', name: 'Doanh thu dịch vụ', iconKey: 'briefcase', color: '#3b82f6' },
    { code: 'DT03', name: 'Thu hồi công nợ', iconKey: 'users', color: '#8b5cf6' },
    { code: 'DT04', name: 'Thu từ đầu tư', iconKey: 'pie-chart', color: '#f59e0b' },
    { code: 'DT05', name: 'Thu khác', iconKey: 'plus-circle', color: '#64748b' },
  ];

  for (const cat of incomeCategories) {
    await prisma.incomeCategory.upsert({
      where: { code: cat.code },
      update: {},
      create: { ...cat, visualType: 'ICON', isActive: true, deletedAt: null },
    });
  }
  console.log(`✅ Created ${incomeCategories.length} income categories`);

  // Expense Categories
  const expenseCategories = [
    { code: 'CP01', name: 'Chi phí nguyên vật liệu', iconKey: 'package', color: '#ef4444' },
    { code: 'CP02', name: 'Chi phí nhân công', iconKey: 'users', color: '#f97316' },
    { code: 'CP03', name: 'Chi phí thuê xưởng', iconKey: 'home', color: '#eab308' },
    { code: 'CP04', name: 'Chi phí vận chuyển', iconKey: 'truck', color: '#84cc16' },
    { code: 'CP05', name: 'Chi phí điện nước', iconKey: 'zap', color: '#14b8a6' },
    { code: 'CP06', name: 'Chi phí marketing', iconKey: 'megaphone', color: '#ec4899' },
    { code: 'CP07', name: 'Chi phí khác', iconKey: 'minus-circle', color: '#64748b' },
  ];

  for (const cat of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { code: cat.code },
      update: {},
      create: { ...cat, visualType: 'ICON', isActive: true, deletedAt: null },
    });
  }
  console.log(`✅ Created ${expenseCategories.length} expense categories`);
}

// Seed Products (Trần gỗ và Phụ kiện)
async function seedProducts() {
  const products = [
    // Trần gỗ
    { code: 'SP0001', name: 'Trần gỗ óc chó', unit: 'm2', defaultSalePrice: 2500000, productType: 'CEILING_WOOD' as const, imageUrl: '/placeholder-product.png' },
    { code: 'SP0002', name: 'Trần gỗ sồi', unit: 'm2', defaultSalePrice: 1800000, productType: 'CEILING_WOOD' as const, imageUrl: '/placeholder-product.png' },
    { code: 'SP0003', name: 'Trần gỗ tếch', unit: 'm2', defaultSalePrice: 2200000, productType: 'CEILING_WOOD' as const, imageUrl: '/placeholder-product.png' },
    { code: 'SP0004', name: 'Trần gỗ xoan đào', unit: 'm2', defaultSalePrice: 1600000, productType: 'CEILING_WOOD' as const, imageUrl: '/placeholder-product.png' },
    { code: 'SP0005', name: 'Trần gỗ cao cấp gõ đỏ', unit: 'm2', defaultSalePrice: 3500000, productType: 'CEILING_WOOD' as const, imageUrl: '/placeholder-product.png' },
    // Phụ kiện
    { code: 'SP0006', name: 'Keo dán gỗ chuyên dụng', unit: 'thùng', defaultSalePrice: 450000, productType: 'OTHER_ITEM' as const, imageUrl: '/placeholder-product.png' },
    { code: 'SP0007', name: 'Đinh bấm gỗ', unit: 'hộp', defaultSalePrice: 150000, productType: 'OTHER_ITEM' as const, imageUrl: '/placeholder-product.png' },
    { code: 'SP0008', name: 'Vít inox 3cm', unit: 'hộp', defaultSalePrice: 120000, productType: 'OTHER_ITEM' as const, imageUrl: '/placeholder-product.png' },
    { code: 'SP0009', name: 'Ray trượt ngăn kéo', unit: 'bộ', defaultSalePrice: 380000, productType: 'OTHER_ITEM' as const, imageUrl: '/placeholder-product.png' },
    { code: 'SP0010', name: 'Bản lề cửa gỗ', unit: 'cái', defaultSalePrice: 95000, productType: 'OTHER_ITEM' as const, imageUrl: '/placeholder-product.png' },
    { code: 'SP0011', name: 'Sơn lót gỗ chống mối', unit: 'thùng', defaultSalePrice: 680000, productType: 'OTHER_ITEM' as const, imageUrl: '/placeholder-product.png' },
    { code: 'SP0012', name: 'Sơn bóng gỗ ngoại thất', unit: 'thùng', defaultSalePrice: 1200000, productType: 'OTHER_ITEM' as const, imageUrl: '/placeholder-product.png' },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { code: p.code },
      update: {},
      create: {
        ...p,
        visualType: 'IMAGE',
        isActive: true,
        deletedAt: null,
      },
    });
  }
  const ceilingCount = products.filter(p => p.productType === 'CEILING_WOOD').length;
  console.log(`✅ Created ${products.length} products (${ceilingCount}trần gỗ, ${products.length - ceilingCount} phụ kiện)`);
}

// Seed Suppliers (Nhà cung cấp)
async function seedSuppliers() {
  const suppliers = [
    { code: 'NCC001', name: 'Công ty Gỗ Óc Chó Miền Nam', phone: '0901111222', address: '123 Đường Đồng Nai, TP.Biên Hòa', region: 'Đồng Nai', note: 'Cung cấp gỗ óc chó, sồi' },
    { code: 'NCC002', name: 'Công ty VLXD Hoàng Gia', phone: '0902222333', address: '456 Đường Võ Văn Ngân, Q.Thủ Đức', region: 'HCM', note: 'Cung cấp sơn, keo, phụ kiện' },
    { code: 'NCC003', name: 'Xưởng Gỗ Mỹ Nghệ Bình Dương', phone: '0903333444', address: '789 KCN Sóng Thần, TX.Dĩ An', region: 'Bình Dương', note: 'Gia công đồ gỗ nội thất' },
    { code: 'NCC004', name: 'Công ty Phụ Kiện Ngân Hạnh', phone: '0904444555', address: '321 Đường 3/2, Q.10', region: 'HCM', note: 'Cung cấp bản lề, ray, khóa' },
    { code: 'NCC005', name: 'Đại lý Sơn Hải Phòng', phone: '0905555666', address: '555 Đường Lê Hồng Phong, Q.Ngô Quyền', region: 'Hải Phòng', note: 'Cung cấp sơn chống mối, sơn bóng' },
    { code: 'NCC006', name: 'Công ty Inox Đại Phát', phone: '0906666777', address: '888 KCN Tân Thuận, Q.7', region: 'HCM', note: 'Cung cấp đinh, ốc, vít inox' },
    { code: 'NCC007', name: 'Đại lý Gỗ Tếch Cao Cấp', phone: '0907777888', address: '111 Đường Quang Trung, Q.Gò Vấp', region: 'HCM', note: 'Cung cấp gỗ tếch, gỗ xoan đào' },
    { code: 'NCC008', name: 'Công ty Keo Dán Công Nghiệp', phone: '0908888999', address: '222 Đường Cộng Hòa, Q.Tân Bình', region: 'HCM', note: 'Cung cấp keo dán gỗ chuyên dụng' },
  ];

  for (const s of suppliers) {
    await prisma.supplier.upsert({
      where: { code: s.code },
      update: {},
      create: {
        ...s,
        visualType: 'ICON',
        iconKey: 'truck',
        isActive: true,
        isSample: true,
        deletedAt: null,
      },
    });
  }
  console.log(`✅ Created ${suppliers.length} suppliers`);
}
