-- Add isSample flag columns for sample data tracking
-- Migration generated for cleanup script

-- Add isSample to Customer
ALTER TABLE "Customer" ADD COLUMN "isSample" BOOLEAN NOT NULL DEFAULT false;

-- Add isSample to CustomerFollowUp
ALTER TABLE "CustomerFollowUp" ADD COLUMN "isSample" BOOLEAN NOT NULL DEFAULT false;

-- Add isSample to Supplier
ALTER TABLE "Supplier" ADD COLUMN "isSample" BOOLEAN NOT NULL DEFAULT false;

-- Add isSample to Workshop
ALTER TABLE "Workshop" ADD COLUMN "isSample" BOOLEAN NOT NULL DEFAULT false;

-- Add isSample to WorkshopJob
ALTER TABLE "WorkshopJob" ADD COLUMN "isSample" BOOLEAN NOT NULL DEFAULT false;

-- Add isSample to WorkshopJobItem
ALTER TABLE "WorkshopJobItem" ADD COLUMN "isSample" BOOLEAN NOT NULL DEFAULT false;

-- Add isSample to Transaction
ALTER TABLE "Transaction" ADD COLUMN "isSample" BOOLEAN NOT NULL DEFAULT false;

-- Add isSample to Project
ALTER TABLE "Project" ADD COLUMN "isSample" BOOLEAN NOT NULL DEFAULT false;

-- Add isSample to OrderItem
ALTER TABLE "OrderItem" ADD COLUMN "isSample" BOOLEAN NOT NULL DEFAULT false;

