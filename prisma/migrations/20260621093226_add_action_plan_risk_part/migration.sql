-- AlterTable
ALTER TABLE "RiskActionPlan" ADD COLUMN     "riskEventPartId" TEXT;

-- CreateIndex
CREATE INDEX "RiskActionPlan_riskEventPartId_idx" ON "RiskActionPlan"("riskEventPartId");

-- AddForeignKey
ALTER TABLE "RiskActionPlan" ADD CONSTRAINT "RiskActionPlan_riskEventPartId_fkey" FOREIGN KEY ("riskEventPartId") REFERENCES "RiskEventPart"("id") ON DELETE SET NULL ON UPDATE CASCADE;
