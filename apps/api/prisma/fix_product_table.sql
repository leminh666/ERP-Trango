-- Run this SQL to fix Product table
-- First check current state
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Product';

-- Drop and recreate enum correctly
DROP TYPE IF EXISTS "ProductType" CASCADE;
DROP TYPE IF EXISTS "ProductType_new" CASCADE;

CREATE TYPE "ProductType" AS ENUM ('CEILING_WOOD', 'FURNITURE', 'OTHER_ITEM');

-- Add column if not exists
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "productType" "ProductType";

-- Update existing records
UPDATE "Product" SET "productType" = 'OTHER_ITEM' WHERE "productType" IS NULL;

