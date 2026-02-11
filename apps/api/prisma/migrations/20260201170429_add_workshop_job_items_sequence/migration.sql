-- CreateTable
CREATE TABLE "code_sequences" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "code_sequences_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "WorkshopJobItem" (
    "id" TEXT NOT NULL,
    "workshopJobId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(15,2) NOT NULL,
    "unitPrice" DECIMAL(15,2) NOT NULL,
    "lineTotal" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkshopJobItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkshopJobItem_workshopJobId_idx" ON "WorkshopJobItem"("workshopJobId");

-- CreateIndex
CREATE INDEX "WorkshopJobItem_productId_idx" ON "WorkshopJobItem"("productId");

-- AddForeignKey
ALTER TABLE "WorkshopJobItem" ADD CONSTRAINT "WorkshopJobItem_workshopJobId_fkey" FOREIGN KEY ("workshopJobId") REFERENCES "WorkshopJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopJobItem" ADD CONSTRAINT "WorkshopJobItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
