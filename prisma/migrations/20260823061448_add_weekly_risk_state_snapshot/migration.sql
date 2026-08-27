-- CreateTable
CREATE TABLE "WeeklyRiskStateSnapshot" (
    "id" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "weekEndDate" TIMESTAMP(3) NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "riskEventId" TEXT NOT NULL,
    "code" TEXT,
    "title" TEXT NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "workflowStatus" "RiskWorkflowStatus" NOT NULL,
    "assignedToId" TEXT,
    "supplierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyRiskStateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyRiskStateSnapshot_week_year_idx" ON "WeeklyRiskStateSnapshot"("week", "year");

-- CreateIndex
CREATE INDEX "WeeklyRiskStateSnapshot_riskEventId_idx" ON "WeeklyRiskStateSnapshot"("riskEventId");

-- CreateIndex
CREATE INDEX "WeeklyRiskStateSnapshot_riskLevel_idx" ON "WeeklyRiskStateSnapshot"("riskLevel");

-- CreateIndex
CREATE INDEX "WeeklyRiskStateSnapshot_workflowStatus_idx" ON "WeeklyRiskStateSnapshot"("workflowStatus");

-- CreateIndex
CREATE INDEX "WeeklyRiskStateSnapshot_assignedToId_idx" ON "WeeklyRiskStateSnapshot"("assignedToId");

-- CreateIndex
CREATE INDEX "WeeklyRiskStateSnapshot_supplierId_idx" ON "WeeklyRiskStateSnapshot"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyRiskStateSnapshot_riskEventId_week_year_key" ON "WeeklyRiskStateSnapshot"("riskEventId", "week", "year");

-- AddForeignKey
ALTER TABLE "WeeklyRiskStateSnapshot" ADD CONSTRAINT "WeeklyRiskStateSnapshot_riskEventId_fkey" FOREIGN KEY ("riskEventId") REFERENCES "RiskEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
