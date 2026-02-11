/*
  Warnings:

  - You are about to drop the column `details` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `color` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `iconKey` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `iconType` on the `Wallet` table. All the data in the column will be lost.
  - Added the required column `byUserId` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Made the column `entityId` on table `AuditLog` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "SourceChannel" AS ENUM ('FACEBOOK', 'TIKTOK', 'WEBSITE', 'ZALO', 'INTRODUCED', 'REFERRAL', 'WALK_IN', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkshopJobStatus" AS ENUM ('DRAFT', 'SENT', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VisualType" AS ENUM ('ICON', 'IMAGE');

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'TRANSFER';

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "details",
DROP COLUMN "userId",
ADD COLUMN     "afterJson" JSONB,
ADD COLUMN     "beforeJson" JSONB,
ADD COLUMN     "byUserEmail" TEXT,
ADD COLUMN     "byUserId" TEXT NOT NULL,
ADD COLUMN     "ip" TEXT,
ADD COLUMN     "userAgent" TEXT,
ALTER COLUMN "entityId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "iconKey" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "sourceChannel" "SourceChannel",
ADD COLUMN     "sourceDetail" TEXT,
ADD COLUMN     "visualType" "VisualType" NOT NULL DEFAULT 'ICON';

-- AlterTable
ALTER TABLE "ExpenseCategory" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "visualType" "VisualType" NOT NULL DEFAULT 'ICON',
ALTER COLUMN "iconKey" DROP NOT NULL;

-- AlterTable
ALTER TABLE "IncomeCategory" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "visualType" "VisualType" NOT NULL DEFAULT 'ICON',
ALTER COLUMN "iconKey" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "color",
DROP COLUMN "iconKey",
ADD COLUMN     "imageUrl" TEXT NOT NULL DEFAULT '/placeholder-product.png',
ADD COLUMN     "visualType" "VisualType" NOT NULL DEFAULT 'IMAGE';

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "iconKey" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "visualType" "VisualType" NOT NULL DEFAULT 'ICON';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isCommonCost" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "supplierId" TEXT,
ADD COLUMN     "updatedByUserId" TEXT,
ADD COLUMN     "workshopId" TEXT,
ADD COLUMN     "workshopJobId" TEXT;

-- AlterTable
ALTER TABLE "Wallet" DROP COLUMN "iconType",
ADD COLUMN     "visualType" "VisualType" NOT NULL DEFAULT 'ICON';

-- AlterTable
ALTER TABLE "Workshop" ADD COLUMN     "iconKey" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "visualType" "VisualType" NOT NULL DEFAULT 'ICON';

-- DropEnum
DROP TYPE "IconType";

-- CreateTable
CREATE TABLE "WorkshopJob" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "amount" DECIMAL(15,2) NOT NULL,
    "status" "WorkshopJobStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "note" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkshopJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customerId" TEXT,
    "workshopId" TEXT,
    "address" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'Lead',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "qty" DECIMAL(15,2) NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "note" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopJob_code_key" ON "WorkshopJob"("code");

-- CreateIndex
CREATE INDEX "WorkshopJob_projectId_idx" ON "WorkshopJob"("projectId");

-- CreateIndex
CREATE INDEX "WorkshopJob_workshopId_idx" ON "WorkshopJob"("workshopId");

-- CreateIndex
CREATE INDEX "WorkshopJob_status_idx" ON "WorkshopJob"("status");

-- CreateIndex
CREATE INDEX "WorkshopJob_deletedAt_idx" ON "WorkshopJob"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");

-- CreateIndex
CREATE INDEX "Project_customerId_idx" ON "Project"("customerId");

-- CreateIndex
CREATE INDEX "Project_workshopId_idx" ON "Project"("workshopId");

-- CreateIndex
CREATE INDEX "Project_stage_idx" ON "Project"("stage");

-- CreateIndex
CREATE INDEX "Project_deletedAt_idx" ON "Project"("deletedAt");

-- CreateIndex
CREATE INDEX "OrderItem_projectId_idx" ON "OrderItem"("projectId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderItem_deletedAt_idx" ON "OrderItem"("deletedAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_createdAt_idx" ON "AuditLog"("entity", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_byUserId_createdAt_idx" ON "AuditLog"("byUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "Customer_sourceChannel_idx" ON "Customer"("sourceChannel");

-- CreateIndex
CREATE INDEX "Transaction_projectId_idx" ON "Transaction"("projectId");

-- CreateIndex
CREATE INDEX "Transaction_isCommonCost_idx" ON "Transaction"("isCommonCost");

-- CreateIndex
CREATE INDEX "Transaction_workshopJobId_idx" ON "Transaction"("workshopJobId");

-- CreateIndex
CREATE INDEX "Transaction_deletedAt_idx" ON "Transaction"("deletedAt");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_byUserId_fkey" FOREIGN KEY ("byUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopJob" ADD CONSTRAINT "WorkshopJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopJob" ADD CONSTRAINT "WorkshopJob_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_workshopJobId_fkey" FOREIGN KEY ("workshopJobId") REFERENCES "WorkshopJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
