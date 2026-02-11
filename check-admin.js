const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function checkAdmin() {
  const prisma = new PrismaClient();

  try {
    // Check if admin user exists
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@demo.com' },
    });

    console.log('=== Check Admin User ===');
    console.log('Admin exists:', !!admin);

    if (admin) {
      console.log('Admin details:');
      console.log('  - id:', admin.id);
      console.log('  - email:', admin.email);
      console.log('  - name:', admin.name);
      console.log('  - role:', admin.role);
      console.log('  - isActive:', admin.isActive);
      console.log('  - deletedAt:', admin.deletedAt);

      // Check password
      const testPassword = '123456';
      const hashFromDB = admin.password;
      console.log('  - password hash:', hashFromDB.substring(0, 30) + '...');

      const isValid = await bcrypt.compare(testPassword, hashFromDB);
      console.log('\n✅ Password "123456" valid:', isValid);

      // If not valid, update password
      if (!isValid) {
        const newHash = await bcrypt.hash(testPassword, 10);
        await prisma.user.update({
          where: { email: 'admin@demo.com' },
          data: { password: newHash },
        });
        console.log('🔄 Updated password hash');
      }
    } else {
      console.log('\n❌ Admin user not found! Need to run seed.');
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();

