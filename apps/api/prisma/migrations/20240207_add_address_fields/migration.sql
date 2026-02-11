-- Migration: Add province/district/ward fields to Customer, Supplier, Workshop
-- Date: 2024-02-07

-- Add address fields to Customer table
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "provinceCode" VARCHAR(10);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "provinceName" VARCHAR(255);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "districtCode" VARCHAR(10);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "districtName" VARCHAR(255);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "wardCode" VARCHAR(10);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "wardName" VARCHAR(255);

-- Add address fields to Supplier table
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "provinceCode" VARCHAR(10);
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "provinceName" VARCHAR(255);
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "districtCode" VARCHAR(10);
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "districtName" VARCHAR(255);
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "wardCode" VARCHAR(10);
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "wardName" VARCHAR(255);

-- Add address fields to Workshop table
ALTER TABLE "Workshop" ADD COLUMN IF NOT EXISTS "provinceCode" VARCHAR(10);
ALTER TABLE "Workshop" ADD COLUMN IF NOT EXISTS "provinceName" VARCHAR(255);
ALTER TABLE "Workshop" ADD COLUMN IF NOT EXISTS "districtCode" VARCHAR(10);
ALTER TABLE "Workshop" ADD COLUMN IF NOT EXISTS "districtName" VARCHAR(255);
ALTER TABLE "Workshop" ADD COLUMN IF NOT EXISTS "wardCode" VARCHAR(10);
ALTER TABLE "Workshop" ADD COLUMN IF NOT EXISTS "wardName" VARCHAR(255);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_province_code ON "Customer"("provinceCode");
CREATE INDEX IF NOT EXISTS idx_customer_district_code ON "Customer"("districtCode");
CREATE INDEX IF NOT EXISTS idx_customer_ward_code ON "Customer"("wardCode");

CREATE INDEX IF NOT EXISTS idx_supplier_province_code ON "Supplier"("provinceCode");
CREATE INDEX IF NOT EXISTS idx_supplier_district_code ON "Supplier"("districtCode");
CREATE INDEX IF NOT EXISTS idx_supplier_ward_code ON "Supplier"("wardCode");

CREATE INDEX IF NOT EXISTS idx_workshop_province_code ON "Workshop"("provinceCode");
CREATE INDEX IF NOT EXISTS idx_workshop_district_code ON "Workshop"("districtCode");
CREATE INDEX IF NOT EXISTS idx_workshop_ward_code ON "Workshop"("wardCode");
