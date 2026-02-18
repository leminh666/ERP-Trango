/**
 * Migration Script: Sync Legacy Customers to CRM
 * 
 * Purpose: Copy all legacy customers to CrmCustomer table
 * Usage: npx ts-node scripts/migrate-customers-to-crm.ts
 * 
 * This script:
 * 1. Finds all legacy customers without CrmCustomer
 * 2. Creates CrmCustomer records for them
 * 3. Maps via legacyCustomerId for future reference
 */
import { PrismaClient, CrmStage } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  console.log('🚀 Starting Customer → CRM Migration...\n');

  // Step 1: Get all legacy customers
  const legacyCustomers = await prisma.customer.findMany({
    where: {
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      sourceChannel: true,
      sourceDetail: true,
      ownerUserId: true,
      createdAt: true,
    },
  });

  console.log(`📊 Found ${legacyCustomers.length} legacy customers`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const customer of legacyCustomers) {
    try {
      // Check if CrmCustomer already exists (via customerId relationship)
      const existingCrm = await prisma.crmCustomer.findUnique({
        where: { customerId: customer.id },
      });

      if (existingCrm) {
        // Already has CRM record, just update legacyCustomerId if not set
        if (!existingCrm.legacyCustomerId) {
          await prisma.crmCustomer.update({
            where: { id: existingCrm.id },
            data: { legacyCustomerId: customer.id },
          });
          console.log(`  ✓ Updated legacyCustomerId for: ${customer.name}`);
        }
        skipped++;
        continue;
      }

      // Create new CrmCustomer record
      await prisma.crmCustomer.create({
        data: {
          customerId: customer.id,
          legacyCustomerId: customer.id,
          stage: CrmStage.LEAD,
          ownerUserId: customer.ownerUserId,
        },
      });

      migrated++;
      console.log(`  ✓ Created CRM for: ${customer.name} (${customer.phone || 'no phone'})`);
    } catch (error) {
      errors++;
      console.error(`  ✗ Error for ${customer.name}:`, (error as Error).message);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📈 Migration Summary:');
  console.log(`  ✅ Migrated: ${migrated}`);
  console.log(`  ⏭️  Skipped (already exists): ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log('='.repeat(50));

  // Summary by source
  const sourceStats = await prisma.customer.groupBy({
    by: ['sourceChannel'],
    _count: true,
    where: { deletedAt: null },
  });

  console.log('\n📊 Customer Sources:');
  sourceStats.forEach(s => {
    console.log(`  ${s.sourceChannel || 'UNKNOWN'}: ${s._count}`);
  });
}

migrate()
  .then(() => {
    console.log('\n✅ Migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

