-- CreateEnum
CREATE TYPE "RiskActionPlanHistoryType" AS ENUM ('ACTION_PLAN_CREATE', 'ACTION_PLAN_UPDATE', 'ACTION_PLAN_COMPLETE', 'ACTION_PLAN_REOPEN', 'ACTION_PLAN_DELETE', 'NOTE');

-- CreateTable
CREATE TABLE "RiskActionPlanHistory" (
    "id" TEXT NOT NULL,
    "actionPlanId" TEXT,
    "riskEventId" TEXT NOT NULL,
    "riskEventPartId" TEXT,
    "partNumberId" TEXT,
    "changeType" "RiskActionPlanHistoryType" NOT NULL,
    "oldDescription" TEXT,
    "newDescription" TEXT,
    "oldDueDate" TIMESTAMP(3),
    "newDueDate" TIMESTAMP(3),
    "oldAssignedToId" TEXT,
    "newAssignedToId" TEXT,
    "oldCompleted" BOOLEAN,
    "newCompleted" BOOLEAN,
    "reason" TEXT,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskActionPlanHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RiskActionPlanHistory_actionPlanId_idx" ON "RiskActionPlanHistory"("actionPlanId");

-- CreateIndex
CREATE INDEX "RiskActionPlanHistory_riskEventId_idx" ON "RiskActionPlanHistory"("riskEventId");

-- CreateIndex
CREATE INDEX "RiskActionPlanHistory_riskEventPartId_idx" ON "RiskActionPlanHistory"("riskEventPartId");

-- CreateIndex
CREATE INDEX "RiskActionPlanHistory_partNumberId_idx" ON "RiskActionPlanHistory"("partNumberId");

-- CreateIndex
CREATE INDEX "RiskActionPlanHistory_changedById_idx" ON "RiskActionPlanHistory"("changedById");

-- CreateIndex
CREATE INDEX "RiskActionPlanHistory_changedAt_idx" ON "RiskActionPlanHistory"("changedAt");

-- AddForeignKey
ALTER TABLE "RiskActionPlanHistory" ADD CONSTRAINT "RiskActionPlanHistory_actionPlanId_fkey" FOREIGN KEY ("actionPlanId") REFERENCES "RiskActionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskActionPlanHistory" ADD CONSTRAINT "RiskActionPlanHistory_riskEventId_fkey" FOREIGN KEY ("riskEventId") REFERENCES "RiskEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskActionPlanHistory" ADD CONSTRAINT "RiskActionPlanHistory_riskEventPartId_fkey" FOREIGN KEY ("riskEventPartId") REFERENCES "RiskEventPart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskActionPlanHistory" ADD CONSTRAINT "RiskActionPlanHistory_partNumberId_fkey" FOREIGN KEY ("partNumberId") REFERENCES "PartNumber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskActionPlanHistory" ADD CONSTRAINT "RiskActionPlanHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
