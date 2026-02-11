const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Load env from apps/api/.env first, then root .env
const apiEnvPath = path.resolve(process.cwd(), 'apps/api/.env');
const rootEnvPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(apiEnvPath)) {
  require('dotenv').config({ path: apiEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath });
}

const prisma = new PrismaClient();

async function createTestUsers() {
  console.log('🔧 Creating test users...\n');

  // Create admin@demo.com with password 123456
  const hashedPassword = await bcrypt.hash('123456', 10);
  
  let user = await prisma.user.findUnique({
    where: { email: 'admin@demo.com' }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'admin@demo.com',
        password: hashedPassword,
        name: 'Admin Demo',
        role: 'ADMIN',
        isActive: true,
      }
    });
    console.log('✅ Created: admin@demo.com / 123456');
  } else {
    console.log('ℹ️  User admin@demo.com already exists');
    // Update password to ensure it matches
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });
    console.log('✅ Updated password for admin@demo.com');
  }

  // Create wallet (no userId in Wallet model)
  let wallet = await prisma.wallet.findFirst({
    where: { code: 'DEFAULT' }
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        code: 'DEFAULT',
        name: 'Ví Chính',
        type: 'CASH',
        note: 'Ví mặc định cho hệ thống',
      }
    });
    console.log('✅ Created default wallet');
  } else {
    console.log('ℹ️  Wallet already exists');
  }

  // Create income category (no userId in category models)
  let incomeCat = await prisma.incomeCategory.findFirst({
    where: { code: 'SALARY' }
  });

  if (!incomeCat) {
    incomeCat = await prisma.incomeCategory.create({
      data: {
        code: 'SALARY',
        name: 'Thu nhập từ công việc',
        iconKey: '💰',
        color: '#22c55e',
      }
    });
    console.log('✅ Created income category');
  }

  // Create expense category
  let expenseCat = await prisma.expenseCategory.findFirst({
    where: { code: 'LIVING' }
  });

  if (!expenseCat) {
    expenseCat = await prisma.expenseCategory.create({
      data: {
        code: 'LIVING',
        name: 'Chi phí sinh hoạt',
        iconKey: '🏠',
        color: '#ef4444',
      }
    });
    console.log('✅ Created expense category');
  }

  console.log('\n✅ Test data ready!');
  console.log('   Login: admin@demo.com / 123456');
}

createTestUsers().catch(console.error);

