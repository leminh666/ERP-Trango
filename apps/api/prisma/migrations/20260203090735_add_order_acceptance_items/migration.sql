-- CreateTable
CREATE TABLE "OrderAcceptanceItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "acceptedQty" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderAcceptanceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderAcceptanceItem_projectId_idx" ON "OrderAcceptanceItem"("projectId");

-- CreateIndex
CREATE INDEX "OrderAcceptanceItem_orderItemId_idx" ON "OrderAcceptanceItem"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderAcceptanceItem_projectId_orderItemId_key" ON "OrderAcceptanceItem"("projectId", "orderItemId");

-- AddForeignKey
ALTER TABLE "OrderAcceptanceItem" ADD CONSTRAINT "OrderAcceptanceItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAcceptanceItem" ADD CONSTRAINT "OrderAcceptanceItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
