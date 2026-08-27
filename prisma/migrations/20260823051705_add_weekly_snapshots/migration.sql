-- CreateEnum
CREATE TYPE "SnapshotWeekday" AS ENUM ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');

-- CreateEnum
CREATE TYPE "WeeklySnapshotEventType" AS ENUM ('RISK_CREATED', 'RISK_CLOSED', 'RISK_CANCELED', 'RISK_REOPENED', 'RISK_ASSIGNED', 'RISK_LEVEL_CHANGED', 'RISK_LEVEL_IMPROVED', 'RISK_LEVEL_WORSENED', 'PART_CREATED', 'PART_STATUS_CHANGED', 'ACTION_PLAN_CREATED', 'ACTION_PLAN_COMPLETED', 'ACTION_PLAN_OVERDUE', 'LOGISTICS_REQUEST_CREATED', 'LOGISTICS_REQUEST_ACCEPTED', 'LOGISTICS_REQUEST_APPROVED', 'LOGISTICS_REQUEST_REJECTED', 'LOGISTICS_REQUEST_CANCELED');

-- CreateTable
CREATE TABLE "WeeklySnapshotConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Configuração padrão',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "weekday" "SnapshotWeekday" NOT NULL DEFAULT 'FRIDAY',
    "hour" INTEGER NOT NULL DEFAULT 17,
    "minute" INTEGER NOT NULL DEFAULT 0,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "allowManualRun" BOOLEAN NOT NULL DEFAULT true,
    "overwriteCurrentWeek" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "lastRunWeek" INTEGER,
    "lastRunYear" INTEGER,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklySnapshotConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklySnapshot" (
    "id" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "weekEndDate" TIMESTAMP(3) NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalRisks" INTEGER NOT NULL DEFAULT 0,
    "openRisks" INTEGER NOT NULL DEFAULT 0,
    "closedRisks" INTEGER NOT NULL DEFAULT 0,
    "canceledRisks" INTEGER NOT NULL DEFAULT 0,
    "redRisks" INTEGER NOT NULL DEFAULT 0,
    "yellowRisks" INTEGER NOT NULL DEFAULT 0,
    "greenRisks" INTEGER NOT NULL DEFAULT 0,
    "orangeRisks" INTEGER NOT NULL DEFAULT 0,
    "greyRisks" INTEGER NOT NULL DEFAULT 0,
    "blueRisks" INTEGER NOT NULL DEFAULT 0,
    "totalParts" INTEGER NOT NULL DEFAULT 0,
    "redParts" INTEGER NOT NULL DEFAULT 0,
    "yellowParts" INTEGER NOT NULL DEFAULT 0,
    "greenParts" INTEGER NOT NULL DEFAULT 0,
    "orangeParts" INTEGER NOT NULL DEFAULT 0,
    "greyParts" INTEGER NOT NULL DEFAULT 0,
    "blueParts" INTEGER NOT NULL DEFAULT 0,
    "totalActionPlans" INTEGER NOT NULL DEFAULT 0,
    "openActionPlans" INTEGER NOT NULL DEFAULT 0,
    "inProgressActionPlans" INTEGER NOT NULL DEFAULT 0,
    "waitingValidationActionPlans" INTEGER NOT NULL DEFAULT 0,
    "completedActionPlans" INTEGER NOT NULL DEFAULT 0,
    "canceledActionPlans" INTEGER NOT NULL DEFAULT 0,
    "overdueActionPlans" INTEGER NOT NULL DEFAULT 0,
    "totalLogisticsRequests" INTEGER NOT NULL DEFAULT 0,
    "pendingLogisticsRequests" INTEGER NOT NULL DEFAULT 0,
    "inReviewLogisticsRequests" INTEGER NOT NULL DEFAULT 0,
    "approvedLogisticsRequests" INTEGER NOT NULL DEFAULT 0,
    "rejectedLogisticsRequests" INTEGER NOT NULL DEFAULT 0,
    "canceledLogisticsRequests" INTEGER NOT NULL DEFAULT 0,
    "risksCreatedThisWeek" INTEGER NOT NULL DEFAULT 0,
    "risksClosedThisWeek" INTEGER NOT NULL DEFAULT 0,
    "risksCanceledThisWeek" INTEGER NOT NULL DEFAULT 0,
    "risksReopenedThisWeek" INTEGER NOT NULL DEFAULT 0,
    "risksImprovedThisWeek" INTEGER NOT NULL DEFAULT 0,
    "risksWorsenedThisWeek" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyRiskAnalystSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "weekEndDate" TIMESTAMP(3) NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedRisks" INTEGER NOT NULL DEFAULT 0,
    "openRisks" INTEGER NOT NULL DEFAULT 0,
    "closedRisks" INTEGER NOT NULL DEFAULT 0,
    "canceledRisks" INTEGER NOT NULL DEFAULT 0,
    "redRisks" INTEGER NOT NULL DEFAULT 0,
    "yellowRisks" INTEGER NOT NULL DEFAULT 0,
    "greenRisks" INTEGER NOT NULL DEFAULT 0,
    "orangeRisks" INTEGER NOT NULL DEFAULT 0,
    "greyRisks" INTEGER NOT NULL DEFAULT 0,
    "blueRisks" INTEGER NOT NULL DEFAULT 0,
    "risksCreatedThisWeek" INTEGER NOT NULL DEFAULT 0,
    "risksAssignedThisWeek" INTEGER NOT NULL DEFAULT 0,
    "risksClosedThisWeek" INTEGER NOT NULL DEFAULT 0,
    "risksCanceledThisWeek" INTEGER NOT NULL DEFAULT 0,
    "risksReopenedThisWeek" INTEGER NOT NULL DEFAULT 0,
    "risksImprovedThisWeek" INTEGER NOT NULL DEFAULT 0,
    "risksWorsenedThisWeek" INTEGER NOT NULL DEFAULT 0,
    "actionPlansTotal" INTEGER NOT NULL DEFAULT 0,
    "actionPlansOpen" INTEGER NOT NULL DEFAULT 0,
    "actionPlansOverdue" INTEGER NOT NULL DEFAULT 0,
    "actionPlansWaitingValidation" INTEGER NOT NULL DEFAULT 0,
    "oldestOpenRiskDays" INTEGER,
    "avgResolutionDays" DOUBLE PRECISION,
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyRiskAnalystSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyLogisticsSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "weekEndDate" TIMESTAMP(3) NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedRequests" INTEGER NOT NULL DEFAULT 0,
    "pendingRequests" INTEGER NOT NULL DEFAULT 0,
    "inReviewRequests" INTEGER NOT NULL DEFAULT 0,
    "approvedRequests" INTEGER NOT NULL DEFAULT 0,
    "rejectedRequests" INTEGER NOT NULL DEFAULT 0,
    "canceledRequests" INTEGER NOT NULL DEFAULT 0,
    "requestsReceivedThisWeek" INTEGER NOT NULL DEFAULT 0,
    "requestsAcceptedThisWeek" INTEGER NOT NULL DEFAULT 0,
    "requestsApprovedThisWeek" INTEGER NOT NULL DEFAULT 0,
    "requestsRejectedThisWeek" INTEGER NOT NULL DEFAULT 0,
    "requestsCanceledThisWeek" INTEGER NOT NULL DEFAULT 0,
    "partsUnderLogisticsReview" INTEGER NOT NULL DEFAULT 0,
    "partsApprovedThisWeek" INTEGER NOT NULL DEFAULT 0,
    "oldestPendingRequestDays" INTEGER,
    "avgReviewDays" DOUBLE PRECISION,
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyLogisticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklySnapshotEvent" (
    "id" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "weekEndDate" TIMESTAMP(3) NOT NULL,
    "eventType" "WeeklySnapshotEventType" NOT NULL,
    "riskEventId" TEXT,
    "riskEventPartId" TEXT,
    "logisticsRequestId" TEXT,
    "actionPlanId" TEXT,
    "userId" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklySnapshotEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklySnapshotConfig_isEnabled_idx" ON "WeeklySnapshotConfig"("isEnabled");

-- CreateIndex
CREATE INDEX "WeeklySnapshot_month_year_idx" ON "WeeklySnapshot"("month", "year");

-- CreateIndex
CREATE INDEX "WeeklySnapshot_year_idx" ON "WeeklySnapshot"("year");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklySnapshot_week_year_key" ON "WeeklySnapshot"("week", "year");

-- CreateIndex
CREATE INDEX "WeeklyRiskAnalystSnapshot_userId_idx" ON "WeeklyRiskAnalystSnapshot"("userId");

-- CreateIndex
CREATE INDEX "WeeklyRiskAnalystSnapshot_week_year_idx" ON "WeeklyRiskAnalystSnapshot"("week", "year");

-- CreateIndex
CREATE INDEX "WeeklyRiskAnalystSnapshot_month_year_idx" ON "WeeklyRiskAnalystSnapshot"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyRiskAnalystSnapshot_userId_week_year_key" ON "WeeklyRiskAnalystSnapshot"("userId", "week", "year");

-- CreateIndex
CREATE INDEX "WeeklyLogisticsSnapshot_userId_idx" ON "WeeklyLogisticsSnapshot"("userId");

-- CreateIndex
CREATE INDEX "WeeklyLogisticsSnapshot_week_year_idx" ON "WeeklyLogisticsSnapshot"("week", "year");

-- CreateIndex
CREATE INDEX "WeeklyLogisticsSnapshot_month_year_idx" ON "WeeklyLogisticsSnapshot"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyLogisticsSnapshot_userId_week_year_key" ON "WeeklyLogisticsSnapshot"("userId", "week", "year");

-- CreateIndex
CREATE INDEX "WeeklySnapshotEvent_week_year_idx" ON "WeeklySnapshotEvent"("week", "year");

-- CreateIndex
CREATE INDEX "WeeklySnapshotEvent_month_year_idx" ON "WeeklySnapshotEvent"("month", "year");

-- CreateIndex
CREATE INDEX "WeeklySnapshotEvent_eventType_idx" ON "WeeklySnapshotEvent"("eventType");

-- CreateIndex
CREATE INDEX "WeeklySnapshotEvent_riskEventId_idx" ON "WeeklySnapshotEvent"("riskEventId");

-- CreateIndex
CREATE INDEX "WeeklySnapshotEvent_riskEventPartId_idx" ON "WeeklySnapshotEvent"("riskEventPartId");

-- CreateIndex
CREATE INDEX "WeeklySnapshotEvent_logisticsRequestId_idx" ON "WeeklySnapshotEvent"("logisticsRequestId");

-- CreateIndex
CREATE INDEX "WeeklySnapshotEvent_actionPlanId_idx" ON "WeeklySnapshotEvent"("actionPlanId");

-- CreateIndex
CREATE INDEX "WeeklySnapshotEvent_userId_idx" ON "WeeklySnapshotEvent"("userId");

-- AddForeignKey
ALTER TABLE "WeeklySnapshotConfig" ADD CONSTRAINT "WeeklySnapshotConfig_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklySnapshotConfig" ADD CONSTRAINT "WeeklySnapshotConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyRiskAnalystSnapshot" ADD CONSTRAINT "WeeklyRiskAnalystSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyLogisticsSnapshot" ADD CONSTRAINT "WeeklyLogisticsSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklySnapshotEvent" ADD CONSTRAINT "WeeklySnapshotEvent_riskEventId_fkey" FOREIGN KEY ("riskEventId") REFERENCES "RiskEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklySnapshotEvent" ADD CONSTRAINT "WeeklySnapshotEvent_riskEventPartId_fkey" FOREIGN KEY ("riskEventPartId") REFERENCES "RiskEventPart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklySnapshotEvent" ADD CONSTRAINT "WeeklySnapshotEvent_logisticsRequestId_fkey" FOREIGN KEY ("logisticsRequestId") REFERENCES "LogisticsRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklySnapshotEvent" ADD CONSTRAINT "WeeklySnapshotEvent_actionPlanId_fkey" FOREIGN KEY ("actionPlanId") REFERENCES "RiskActionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklySnapshotEvent" ADD CONSTRAINT "WeeklySnapshotEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
