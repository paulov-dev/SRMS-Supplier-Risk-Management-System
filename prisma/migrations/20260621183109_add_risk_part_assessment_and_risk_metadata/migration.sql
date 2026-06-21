-- AlterTable
ALTER TABLE "RiskEvent" ADD COLUMN     "commodity" TEXT,
ADD COLUMN     "functionalGroup" TEXT;

-- CreateTable
CREATE TABLE "RiskPartAssessment" (
    "id" TEXT NOT NULL,
    "riskEventPartId" TEXT NOT NULL,
    "isPartCanceled" BOOLEAN,
    "hasDemand" BOOLEAN,
    "sourceNamed" BOOLEAN,
    "actionPlanReceived" BOOLEAN,
    "scheduleMeetsDevelopment" BOOLEAN,
    "technicalCommercialOk" BOOLEAN,
    "productionRiskMitigated" BOOLEAN,
    "eopManagementOk" BOOLEAN,
    "deviationPfpFinished" BOOLEAN,
    "onlyVdaPending" BOOLEAN,
    "vdaApproved" BOOLEAN,
    "modificationImplemented" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskPartAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RiskPartAssessment_riskEventPartId_key" ON "RiskPartAssessment"("riskEventPartId");

-- CreateIndex
CREATE INDEX "RiskPartAssessment_riskEventPartId_idx" ON "RiskPartAssessment"("riskEventPartId");

-- CreateIndex
CREATE INDEX "Comment_riskEventId_idx" ON "Comment"("riskEventId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Comment_createdAt_idx" ON "Comment"("createdAt");

-- CreateIndex
CREATE INDEX "RiskEvent_commodity_idx" ON "RiskEvent"("commodity");

-- CreateIndex
CREATE INDEX "RiskEvent_functionalGroup_idx" ON "RiskEvent"("functionalGroup");

-- CreateIndex
CREATE INDEX "SupplierContact_supplierId_idx" ON "SupplierContact"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierRiskScore_supplierId_idx" ON "SupplierRiskScore"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierRiskScore_calculatedAt_idx" ON "SupplierRiskScore"("calculatedAt");

-- AddForeignKey
ALTER TABLE "RiskPartAssessment" ADD CONSTRAINT "RiskPartAssessment_riskEventPartId_fkey" FOREIGN KEY ("riskEventPartId") REFERENCES "RiskEventPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
