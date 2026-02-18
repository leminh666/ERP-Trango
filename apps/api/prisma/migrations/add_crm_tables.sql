-- Migration script to add CRM tables
-- This script creates the CRM-related tables and enums needed for the CRM module

-- Create Enums if they don't exist
DO $$ BEGIN
    CREATE TYPE "CrmStage" AS ENUM ('LEAD', 'QUOTED', 'CONSIDERING', 'APPOINTMENT_SCHEDULED', 'CONTRACT_SIGNED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "CrmActivityType" AS ENUM ('CALL', 'MEETING', 'MESSAGE', 'NOTE', 'QUOTE', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'DONE', 'MISSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create CrmCustomer table
CREATE TABLE IF NOT EXISTS "CrmCustomer" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "customerId" TEXT NOT NULL UNIQUE,
    "legacyCustomerId" TEXT UNIQUE,
    "stage" "CrmStage" NOT NULL DEFAULT 'LEAD',
    "area" TEXT,
    "layout" TEXT,
    "style" TEXT,
    "architectureType" TEXT,
    "briefNote" TEXT,
    "ownerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add discountAmount to Project if not exists
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(15,2) DEFAULT 0;

-- Create indexes for CrmCustomer
CREATE INDEX IF NOT EXISTS "CrmCustomer_stage_idx" ON "CrmCustomer"("stage");
CREATE INDEX IF NOT EXISTS "CrmCustomer_customerId_idx" ON "CrmCustomer"("customerId");
CREATE INDEX IF NOT EXISTS "CrmCustomer_ownerUserId_idx" ON "CrmCustomer"("ownerUserId");
CREATE INDEX IF NOT EXISTS "CrmCustomer_legacyCustomerId_idx" ON "CrmCustomer"("legacyCustomerId");

-- Create CrmActivity table
CREATE TABLE IF NOT EXISTS "CrmActivity" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CrmActivityType" NOT NULL,
    "outcome" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextFollowUpAt" TIMESTAMP(3),
    "nextFollowUpNote" TEXT,
    "followUpStatus" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM'
);

-- Create indexes for CrmActivity
CREATE INDEX IF NOT EXISTS "CrmActivity_customerId_idx" ON "CrmActivity"("customerId");
CREATE INDEX IF NOT EXISTS "CrmActivity_userId_idx" ON "CrmActivity"("userId");
CREATE INDEX IF NOT EXISTS "CrmActivity_type_idx" ON "CrmActivity"("type");
CREATE INDEX IF NOT EXISTS "CrmActivity_createdAt_idx" ON "CrmActivity"("createdAt");
CREATE INDEX IF NOT EXISTS "CrmActivity_nextFollowUpAt_idx" ON "CrmActivity"("nextFollowUpAt");
CREATE INDEX IF NOT EXISTS "CrmActivity_followUpStatus_idx" ON "CrmActivity"("followUpStatus");

-- Create CrmStageHistory table
CREATE TABLE IF NOT EXISTS "CrmStageHistory" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromStage" "CrmStage",
    "toStage" "CrmStage" NOT NULL,
    "note" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for CrmStageHistory
CREATE INDEX IF NOT EXISTS "CrmStageHistory_customerId_idx" ON "CrmStageHistory"("customerId");
CREATE INDEX IF NOT EXISTS "CrmStageHistory_userId_idx" ON "CrmStageHistory"("userId");
CREATE INDEX IF NOT EXISTS "CrmStageHistory_createdAt_idx" ON "CrmStageHistory"("createdAt");

-- Add foreign key constraints (if tables exist)
DO $$ 
BEGIN
    -- CrmCustomer to Customer
    ALTER TABLE "CrmCustomer" ADD CONSTRAINT "CrmCustomer_customerId_fkey" 
        FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_column THEN null;
    WHEN undefined_table THEN null;
END $$;

DO $$ 
BEGIN
    -- CrmCustomer to User (owner)
    ALTER TABLE "CrmCustomer" ADD CONSTRAINT "CrmCustomer_ownerUserId_fkey" 
        FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_column THEN null;
    WHEN undefined_table THEN null;
END $$;

DO $$ 
BEGIN
    -- CrmActivity to CrmCustomer
    ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_customerId_fkey" 
        FOREIGN KEY ("customerId") REFERENCES "CrmCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_column THEN null;
    WHEN undefined_table THEN null;
END $$;

DO $$ 
BEGIN
    -- CrmActivity to User
    ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_column THEN null;
    WHEN undefined_table THEN null;
END $$;

DO $$ 
BEGIN
    -- CrmStageHistory to CrmCustomer
    ALTER TABLE "CrmStageHistory" ADD CONSTRAINT "CrmStageHistory_customerId_fkey" 
        FOREIGN KEY ("customerId") REFERENCES "CrmCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_column THEN null;
    WHEN undefined_table THEN null;
END $$;

DO $$ 
BEGIN
    -- CrmStageHistory to User
    ALTER TABLE "CrmStageHistory" ADD CONSTRAINT "CrmStageHistory_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_column THEN null;
    WHEN undefined_table THEN null;
END $$;

-- Add crm relation to Customer table (if not exists)
DO $$
BEGIN
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "crmCustomerId" TEXT UNIQUE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Note: The actual relation will be managed by Prisma

SELECT 'CRM Migration completed successfully!' as result;

