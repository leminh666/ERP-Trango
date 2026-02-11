-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('NEW', 'CONTACTED', 'CONSIDERING', 'PRICE_TOO_HIGH', 'APPOINTMENT_SET', 'SURVEY_SCHEDULED', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "FollowUpType" AS ENUM ('CALL', 'MEETING', 'SURVEY', 'QUOTE', 'OTHER');

-- CreateEnum
CREATE TYPE "FollowUpOutcome" AS ENUM ('PENDING', 'DONE', 'CANCELLED', 'NO_SHOW');

-- AlterTable
ALTER TABLE "SystemSetting" ALTER COLUMN "createdAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "region" TEXT,
    "city" TEXT,
    "district" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'NEW',
    "lostReason" TEXT,
    "nextFollowUpAt" TIMESTAMP(3),
    "nextFollowUpNote" TEXT,
    "ownerUserId" TEXT,
    "tags" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerFollowUp" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "FollowUpType" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "outcome" "FollowUpOutcome" NOT NULL DEFAULT 'PENDING',
    "outcomeNote" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "region" TEXT,
    "city" TEXT,
    "district" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workshop" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workshop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");

-- CreateIndex
CREATE INDEX "Customer_status_idx" ON "Customer"("status");

-- CreateIndex
CREATE INDEX "Customer_region_idx" ON "Customer"("region");

-- CreateIndex
CREATE INDEX "Customer_ownerUserId_idx" ON "Customer"("ownerUserId");

-- CreateIndex
CREATE INDEX "Customer_nextFollowUpAt_idx" ON "Customer"("nextFollowUpAt");

-- CreateIndex
CREATE INDEX "Customer_deletedAt_idx" ON "Customer"("deletedAt");

-- CreateIndex
CREATE INDEX "CustomerFollowUp_customerId_idx" ON "CustomerFollowUp"("customerId");

-- CreateIndex
CREATE INDEX "CustomerFollowUp_scheduledAt_idx" ON "CustomerFollowUp"("scheduledAt");

-- CreateIndex
CREATE INDEX "CustomerFollowUp_outcome_idx" ON "CustomerFollowUp"("outcome");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");

-- CreateIndex
CREATE INDEX "Supplier_deletedAt_idx" ON "Supplier"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Workshop_code_key" ON "Workshop"("code");

-- CreateIndex
CREATE INDEX "Workshop_deletedAt_idx" ON "Workshop"("deletedAt");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFollowUp" ADD CONSTRAINT "CustomerFollowUp_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFollowUp" ADD CONSTRAINT "CustomerFollowUp_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
