-- Migration: update_product_type_enum
-- Purpose: Replace isCeilingWood boolean with ProductType enum (CEILING_WOOD, FURNITURE, OTHER_ITEM)
-- Note: defaultSalePrice column is kept for backward compatibility

-- Step 1: Add new enum type
DO $$ BEGIN
    CREATE TYPE "ProductType_new" AS ENUM ('CEILING_WOOD', 'FURNITURE', 'OTHER_ITEM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add new column
ALTER TABLE "Product" ADD COLUMN "productType_new" "ProductType_new";

-- Step 3: Migrate data from isCeilingWood to productType_new
-- isCeilingWood = true -> CEILING_WOOD
-- isCeilingWood = false -> OTHER_ITEM (old "phụ kiện" records become "Hạng mục khác")
UPDATE "Product" SET "productType_new" = 'CEILING_WOOD' WHERE "isCeilingWood" = true;
UPDATE "Product" SET "productType_new" = 'OTHER_ITEM' WHERE "isCeilingWood" = false OR "isCeilingWood" IS NULL;

-- Step 4: Drop old column and rename new column
ALTER TABLE "Product" DROP COLUMN "isCeilingWood";
ALTER TABLE "Product" RENAME COLUMN "productType_new" TO "productType";

-- Step 5: Drop old enum type if exists
DROP TYPE IF EXISTS "ProductType";

-- Step 6: Create index on new column
CREATE INDEX "Product_productType_idx" ON "Product"("productType");

-- Step 7: Drop old index
DROP INDEX IF EXISTS "Product_isCeilingWood_idx";
