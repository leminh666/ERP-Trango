-- Migration: fix_product_type_enum
-- Purpose: Create correct ProductType enum and fix column type

-- Step 1: Drop the incorrectly named enum with CASCADE
DROP TYPE IF EXISTS "ProductType_new" CASCADE;

-- Step 2: Create the correct enum type
DO $$ BEGIN
    CREATE TYPE "ProductType" AS ENUM ('CEILING_WOOD', 'FURNITURE', 'OTHER_ITEM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 3: Alter column to use correct type (if needed)
-- First check current type
-- ALTER TABLE "Product" ALTER COLUMN "productType" TYPE "ProductType" USING "productType"::text::"ProductType";

