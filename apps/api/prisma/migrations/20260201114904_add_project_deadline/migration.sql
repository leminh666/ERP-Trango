-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "deadline" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Project_deadline_idx" ON "Project"("deadline");
