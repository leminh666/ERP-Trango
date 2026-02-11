-- Migration: add_product_attrs_variants
-- Description: Add product attributes (groups, values with hierarchy), variants with imageUrl, and variantId to OrderItem

-- NOTE: Order must be: ProductAttributeGroup -> ProductAttributeValue -> ProductVariant -> ProductVariantAttribute -> OrderItem(variantId)

-- 1. Create ProductAttributeGroup table
CREATE TABLE "ProductAttributeGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,
    CONSTRAINT "ProductAttributeGroup_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProductAttributeGroup" ADD CONSTRAINT "ProductAttributeGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "ProductAttributeGroup_productId_idx" ON "ProductAttributeGroup"("productId");

-- 2. Create ProductAttributeValue table (with parentValueId for hierarchy)
CREATE TABLE "ProductAttributeValue" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "groupId" TEXT NOT NULL,
    "parentValueId" TEXT,
    CONSTRAINT "ProductAttributeValue_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ProductAttributeGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_parentValueId_fkey" FOREIGN KEY ("parentValueId") REFERENCES "ProductAttributeValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "ProductAttributeValue_groupId_idx" ON "ProductAttributeValue"("groupId");
CREATE INDEX "ProductAttributeValue_parentValueId_idx" ON "ProductAttributeValue"("parentValueId");

-- 3. Create ProductVariant table (with imageUrl)
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "price" DECIMAL(15, 2),
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,
    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");
CREATE INDEX "ProductVariant_isActive_idx" ON "ProductVariant"("isActive");

-- 4. Create ProductVariantAttribute junction table
CREATE TABLE "ProductVariantAttribute" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "valueId" TEXT NOT NULL,
    CONSTRAINT "ProductVariantAttribute_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProductVariantAttribute" ADD CONSTRAINT "ProductVariantAttribute_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductVariantAttribute" ADD CONSTRAINT "ProductVariantAttribute_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "ProductAttributeValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "ProductVariantAttribute_variantId_valueId_key" ON "ProductVariantAttribute"("variantId", "valueId");
CREATE INDEX "ProductVariantAttribute_valueId_idx" ON "ProductVariantAttribute"("valueId");

-- 5. Add variantId to OrderItem (must be AFTER ProductVariant exists)
ALTER TABLE "OrderItem" ADD COLUMN "variantId" TEXT;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");
