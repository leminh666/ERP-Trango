// Direct Prisma query test
const { PrismaClient } = require('@prisma/client');

async function test() {
  console.log('=== DIRECT PRISMA TEST ===\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Get ALL wallets
    console.log('1. Get ALL wallets:');
    const allWallets = await prisma.wallet.findMany({
      orderBy: { code: 'desc' },
    });
    console.log(`   Total: ${allWallets.length}`);
    allWallets.forEach(w => console.log(`   - ${w.code}: ${w.name}`));
    console.log('');

    // Get W-prefixed wallets
    console.log('2. Get W-prefixed wallets using startsWith:');
    const wWallets = await prisma.wallet.findMany({
      where: {
        code: {
          startsWith: 'W',
        },
      },
      orderBy: { code: 'desc' },
    });
    console.log(`   Total: ${wWallets.length}`);
    wWallets.forEach(w => console.log(`   - ${w.code}: ${w.name}`));
    console.log('');

    // Test exact code generation
    console.log('3. Code generation test:');
    if (allWallets.length === 0) {
      console.log('   No wallets, would create W0001');
    } else {
      const lastWallet = allWallets[0];
      const prefix = 'W';
      const numericPart = lastWallet.code.startsWith(prefix)
        ? lastWallet.code.slice(prefix.length)
        : null;
      const num = numericPart ? parseInt(numericPart, 10) : null;
      console.log(`   Last wallet: ${lastWallet.code}`);
      console.log(`   Numeric part: ${numericPart} -> ${num}`);
      console.log(`   Next code: W${String((num || 0) + 1).padStart(4, '0')}`);
    }
    console.log('');

    // Check if W0001 exists
    console.log('4. Check if W0001 exists:');
    const w0001 = await prisma.wallet.findUnique({
      where: { code: 'W0001' },
    });
    console.log(`   W0001 exists: ${w0001 ? 'YES' : 'NO'}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();

