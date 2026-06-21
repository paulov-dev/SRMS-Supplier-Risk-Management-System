-- CreateEnum
CREATE TYPE "RiskPartHistoryType" AS ENUM ('STATUS_CHANGE', 'RESPONSIBLE_CHANGE', 'DATA_CHANGE', 'LOGISTICS_CHANGE', 'MULTIPLE_CHANGE', 'NOTE');

-- CreateTable
CREATE TABLE "RiskEventPartHistory" (
    "id" TEXT NOT NULL,
    "riskEventPartId" TEXT,
    "riskEventId" TEXT NOT NULL,
    "partNumberId" TEXT NOT NULL,
    "changeType" "RiskPartHistoryType" NOT NULL,
    "oldStatus" "PartRiskStatus",
    "newStatus" "PartRiskStatus",
    "oldLogisticsStatus" "RiskPartLogisticsStatus",
    "newLogisticsStatus" "RiskPartLogisticsStatus",
    "oldAssignedToId" TEXT,
    "newAssignedToId" TEXT,
    "oldDescription" TEXT,
    "newDescription" TEXT,
    "oldVehicleProgram" TEXT,
    "newVehicleProgram" TEXT,
    "reason" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskEventPartHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RiskEventPartHistory_riskEventPartId_idx" ON "RiskEventPartHistory"("riskEventPartId");

-- CreateIndex
CREATE INDEX "RiskEventPartHistory_riskEventId_idx" ON "RiskEventPartHistory"("riskEventId");

-- CreateIndex
CREATE INDEX "RiskEventPartHistory_partNumberId_idx" ON "RiskEventPartHistory"("partNumberId");

-- CreateIndex
CREATE INDEX "RiskEventPartHistory_changedById_idx" ON "RiskEventPartHistory"("changedById");

-- CreateIndex
CREATE INDEX "RiskEventPartHistory_changedAt_idx" ON "RiskEventPartHistory"("changedAt");

-- CreateIndex
CREATE INDEX "RiskEventPartHistory_riskEventId_changedAt_idx" ON "RiskEventPartHistory"("riskEventId", "changedAt");

-- CreateIndex
CREATE INDEX "RiskEventPartHistory_partNumberId_changedAt_idx" ON "RiskEventPartHistory"("partNumberId", "changedAt");

-- AddForeignKey
ALTER TABLE "RiskEventPartHistory" ADD CONSTRAINT "RiskEventPartHistory_riskEventPartId_fkey" FOREIGN KEY ("riskEventPartId") REFERENCES "RiskEventPart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskEventPartHistory" ADD CONSTRAINT "RiskEventPartHistory_riskEventId_fkey" FOREIGN KEY ("riskEventId") REFERENCES "RiskEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskEventPartHistory" ADD CONSTRAINT "RiskEventPartHistory_partNumberId_fkey" FOREIGN KEY ("partNumberId") REFERENCES "PartNumber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskEventPartHistory" ADD CONSTRAINT "RiskEventPartHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
