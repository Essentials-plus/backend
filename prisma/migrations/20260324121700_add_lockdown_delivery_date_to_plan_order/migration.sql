-- AlterTable
ALTER TABLE "PlanOrder" ADD COLUMN     "deliveryDate" TIMESTAMP(3),
ADD COLUMN     "lockdownDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PlanOrder_lockdownDate_deliveryDate_idx" ON "PlanOrder"("lockdownDate", "deliveryDate");
