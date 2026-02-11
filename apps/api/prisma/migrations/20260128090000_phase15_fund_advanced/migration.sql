-- Phase 15: Sổ quỹ nâng cao
-- Add walletToId and feeAmount to Transaction
-- Add WalletAdjustment model

-- Add columns to Transaction (nullable for existing records)
ALTER TABLE "Transaction" ADD COLUMN "walletToId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "feeAmount" DECIMAL(15, 2) NOT NULL DEFAULT 0;

-- Add foreign key for walletToId
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_walletToId_fkey" FOREIGN KEY ("walletToId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create WalletAdjustment table
CREATE TABLE "WalletAdjustment" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(15, 2) NOT NULL,
    "note" TEXT,
    "createdByUserId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WalletAdjustment_pkey" PRIMARY KEY ("id")
);

-- Add foreign key for WalletAdjustment
ALTER TABLE "WalletAdjustment" ADD CONSTRAINT "WalletAdjustment_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX "WalletAdjustment_walletId_idx" ON "WalletAdjustment"("walletId");
CREATE INDEX "WalletAdjustment_date_idx" ON "WalletAdjustment"("date");
CREATE INDEX "WalletAdjustment_deletedAt_idx" ON "WalletAdjustment"("deletedAt");
CREATE INDEX "Transaction_walletToId_idx" ON "Transaction"("walletToId");

