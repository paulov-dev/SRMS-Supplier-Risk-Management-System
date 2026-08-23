/*
  Warnings:

  - You are about to drop the column `completedAt` on the `RiskActionPlan` table. All the data in the column will be lost.
  - You are about to drop the column `isCompleted` on the `RiskActionPlan` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RiskActionPlanStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_VALIDATION', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "RiskActionPlanPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RiskActionPlanHistoryType" ADD VALUE 'ACTION_PLAN_START';
ALTER TYPE "RiskActionPlanHistoryType" ADD VALUE 'ACTION_PLAN_SUBMIT_VALIDATION';
ALTER TYPE "RiskActionPlanHistoryType" ADD VALUE 'ACTION_PLAN_VALIDATE';
ALTER TYPE "RiskActionPlanHistoryType" ADD VALUE 'ACTION_PLAN_CANCEL';
ALTER TYPE "RiskActionPlanHistoryType" ADD VALUE 'RESPONSIBLE_CHANGE';
ALTER TYPE "RiskActionPlanHistoryType" ADD VALUE 'DUE_DATE_CHANGE';
ALTER TYPE "RiskActionPlanHistoryType" ADD VALUE 'STATUS_CHANGE';

-- DropForeignKey
ALTER TABLE "RiskActionPlan" DROP CONSTRAINT "RiskActionPlan_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "RiskActionPlan" DROP CONSTRAINT "RiskActionPlan_riskEventId_fkey";

-- DropIndex
DROP INDEX "RiskActionPlan_isCompleted_idx";

-- AlterTable
ALTER TABLE "RiskActionPlan" DROP COLUMN "completedAt",
DROP COLUMN "isCompleted",
ADD COLUMN     "closingNotes" TEXT,
ADD COLUMN     "evidenceUrl" TEXT,
ADD COLUMN     "priority" "RiskActionPlanPriority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "requiredAction" TEXT,
ADD COLUMN     "responsibleArea" TEXT,
ADD COLUMN     "status" "RiskActionPlanStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "title" TEXT NOT NULL DEFAULT 'Plano de ação',
ADD COLUMN     "validatedAt" TIMESTAMP(3),
ADD COLUMN     "validatedById" TEXT,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "dueDate" DROP NOT NULL,
ALTER COLUMN "assignedToId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RiskActionPlanHistory" ADD COLUMN     "newClosingNotes" TEXT,
ADD COLUMN     "newEvidenceUrl" TEXT,
ADD COLUMN     "newPriority" "RiskActionPlanPriority",
ADD COLUMN     "newRequiredAction" TEXT,
ADD COLUMN     "newResponsibleArea" TEXT,
ADD COLUMN     "newStatus" "RiskActionPlanStatus",
ADD COLUMN     "newSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "newTitle" TEXT,
ADD COLUMN     "newValidatedAt" TIMESTAMP(3),
ADD COLUMN     "newValidatedById" TEXT,
ADD COLUMN     "oldClosingNotes" TEXT,
ADD COLUMN     "oldEvidenceUrl" TEXT,
ADD COLUMN     "oldPriority" "RiskActionPlanPriority",
ADD COLUMN     "oldRequiredAction" TEXT,
ADD COLUMN     "oldResponsibleArea" TEXT,
ADD COLUMN     "oldStatus" "RiskActionPlanStatus",
ADD COLUMN     "oldSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "oldTitle" TEXT,
ADD COLUMN     "oldValidatedAt" TIMESTAMP(3),
ADD COLUMN     "oldValidatedById" TEXT;

-- CreateIndex
CREATE INDEX "RiskActionPlan_validatedById_idx" ON "RiskActionPlan"("validatedById");

-- CreateIndex
CREATE INDEX "RiskActionPlan_priority_idx" ON "RiskActionPlan"("priority");

-- CreateIndex
CREATE INDEX "RiskActionPlan_status_idx" ON "RiskActionPlan"("status");

-- CreateIndex
CREATE INDEX "RiskActionPlanHistory_changeType_idx" ON "RiskActionPlanHistory"("changeType");

-- AddForeignKey
ALTER TABLE "RiskActionPlan" ADD CONSTRAINT "RiskActionPlan_riskEventId_fkey" FOREIGN KEY ("riskEventId") REFERENCES "RiskEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskActionPlan" ADD CONSTRAINT "RiskActionPlan_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskActionPlan" ADD CONSTRAINT "RiskActionPlan_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
