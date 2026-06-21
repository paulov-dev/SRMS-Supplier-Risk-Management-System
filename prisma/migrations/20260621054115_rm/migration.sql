/*
  Warnings:

  - The values [IN_REVIEW] on the enum `LogisticsStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `statusId` on the `RiskEvent` table. All the data in the column will be lost.
  - You are about to drop the column `impactLevelId` on the `RiskEventPart` table. All the data in the column will be lost.
  - You are about to drop the column `newStatusId` on the `RiskStatusHistory` table. All the data in the column will be lost.
  - You are about to drop the column `oldStatusId` on the `RiskStatusHistory` table. All the data in the column will be lost.
  - You are about to drop the `ImpactLevel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RiskStatus` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[partNumber]` on the table `PartNumber` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `RiskEvent` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sequenceNumber]` on the table `RiskEvent` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[riskEventId,partNumberId]` on the table `RiskEventPart` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `RiskEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `codePrefix` to the `RiskEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdWeek` to the `RiskEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdYear` to the `RiskEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `openingReason` to the `RiskEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sequenceNumber` to the `RiskEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `RiskEventPart` table without a default value. This is not possible if the table is not empty.
  - Added the required column `newStatus` to the `RiskStatusHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `oldStatus` to the `RiskStatusHistory` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RiskCodePrefix" AS ENUM ('RM', 'IRM');

-- CreateEnum
CREATE TYPE "RiskOpeningReason" AS ENUM ('TIER_2_CHANGE', 'PLANT_CHANGE', 'SUPPLIER_TRANSFER_PHASE_OUT', 'MANUFACTURING_PROCESS_CHANGE');

-- CreateEnum
CREATE TYPE "RiskWorkflowStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELED');

-- CreateEnum
CREATE TYPE "PartRiskStatus" AS ENUM ('RED', 'YELLOW', 'GREEN', 'ORANGE', 'GREY', 'BLUE');

-- CreateEnum
CREATE TYPE "RiskPartLogisticsStatus" AS ENUM ('NOT_REQUESTED', 'PENDING', 'IN_LOGISTICS', 'REJECTED');

-- AlterEnum
BEGIN;
CREATE TYPE "LogisticsStatus_new" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
ALTER TABLE "LogisticsRequest" ALTER COLUMN "status" TYPE "LogisticsStatus_new" USING ("status"::text::"LogisticsStatus_new");
ALTER TYPE "LogisticsStatus" RENAME TO "LogisticsStatus_old";
ALTER TYPE "LogisticsStatus_new" RENAME TO "LogisticsStatus";
DROP TYPE "public"."LogisticsStatus_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "RiskEvent" DROP CONSTRAINT "RiskEvent_statusId_fkey";

-- DropForeignKey
ALTER TABLE "RiskEventPart" DROP CONSTRAINT "RiskEventPart_impactLevelId_fkey";

-- DropForeignKey
ALTER TABLE "RiskStatusHistory" DROP CONSTRAINT "RiskStatusHistory_newStatusId_fkey";

-- DropForeignKey
ALTER TABLE "RiskStatusHistory" DROP CONSTRAINT "RiskStatusHistory_oldStatusId_fkey";

-- AlterTable
ALTER TABLE "LogisticsRequest" ADD COLUMN     "rejectionReason" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "RiskEvent" DROP COLUMN "statusId",
ADD COLUMN     "closedById" TEXT,
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "codePrefix" "RiskCodePrefix" NOT NULL,
ADD COLUMN     "createdWeek" INTEGER NOT NULL,
ADD COLUMN     "createdYear" INTEGER NOT NULL,
ADD COLUMN     "openingReason" "RiskOpeningReason" NOT NULL,
ADD COLUMN     "sequenceNumber" INTEGER NOT NULL,
ADD COLUMN     "workflowStatus" "RiskWorkflowStatus" NOT NULL DEFAULT 'OPEN',
ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "riskLevel" SET DEFAULT 'GREEN';

-- AlterTable
ALTER TABLE "RiskEventPart" DROP COLUMN "impactLevelId",
ADD COLUMN     "logisticsStatus" "RiskPartLogisticsStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
ADD COLUMN     "status" "PartRiskStatus" NOT NULL DEFAULT 'GREEN',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "RiskStatusHistory" DROP COLUMN "newStatusId",
DROP COLUMN "oldStatusId",
ADD COLUMN     "newStatus" "RiskWorkflowStatus" NOT NULL,
ADD COLUMN     "oldStatus" "RiskWorkflowStatus" NOT NULL;

-- DropTable
DROP TABLE "ImpactLevel";

-- DropTable
DROP TABLE "RiskStatus";

-- CreateTable
CREATE TABLE "RiskSequence" (
    "key" TEXT NOT NULL,
    "currentNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskSequence_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "RiskActionPlan" (
    "id" TEXT NOT NULL,
    "riskEventId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskActionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RiskActionPlan_riskEventId_idx" ON "RiskActionPlan"("riskEventId");

-- CreateIndex
CREATE INDEX "RiskActionPlan_createdById_idx" ON "RiskActionPlan"("createdById");

-- CreateIndex
CREATE INDEX "RiskActionPlan_assignedToId_idx" ON "RiskActionPlan"("assignedToId");

-- CreateIndex
CREATE INDEX "RiskActionPlan_dueDate_idx" ON "RiskActionPlan"("dueDate");

-- CreateIndex
CREATE INDEX "RiskActionPlan_isCompleted_idx" ON "RiskActionPlan"("isCompleted");

-- CreateIndex
CREATE INDEX "LogisticsBuffer_logisticsRequestId_idx" ON "LogisticsBuffer"("logisticsRequestId");

-- CreateIndex
CREATE INDEX "LogisticsBuffer_partNumberId_idx" ON "LogisticsBuffer"("partNumberId");

-- CreateIndex
CREATE INDEX "LogisticsBuffer_createdBy_idx" ON "LogisticsBuffer"("createdBy");

-- CreateIndex
CREATE INDEX "LogisticsRequest_riskEventId_idx" ON "LogisticsRequest"("riskEventId");

-- CreateIndex
CREATE INDEX "LogisticsRequest_requestedBy_idx" ON "LogisticsRequest"("requestedBy");

-- CreateIndex
CREATE INDEX "LogisticsRequest_assignedTo_idx" ON "LogisticsRequest"("assignedTo");

-- CreateIndex
CREATE INDEX "LogisticsRequest_status_idx" ON "LogisticsRequest"("status");

-- CreateIndex
CREATE INDEX "LogisticsRequest_requestedAt_idx" ON "LogisticsRequest"("requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartNumber_partNumber_key" ON "PartNumber"("partNumber");

-- CreateIndex
CREATE INDEX "PartNumber_partNumber_idx" ON "PartNumber"("partNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RiskEvent_code_key" ON "RiskEvent"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RiskEvent_sequenceNumber_key" ON "RiskEvent"("sequenceNumber");

-- CreateIndex
CREATE INDEX "RiskEvent_code_idx" ON "RiskEvent"("code");

-- CreateIndex
CREATE INDEX "RiskEvent_sequenceNumber_idx" ON "RiskEvent"("sequenceNumber");

-- CreateIndex
CREATE INDEX "RiskEvent_supplierId_idx" ON "RiskEvent"("supplierId");

-- CreateIndex
CREATE INDEX "RiskEvent_createdById_idx" ON "RiskEvent"("createdById");

-- CreateIndex
CREATE INDEX "RiskEvent_assignedToId_idx" ON "RiskEvent"("assignedToId");

-- CreateIndex
CREATE INDEX "RiskEvent_workflowStatus_idx" ON "RiskEvent"("workflowStatus");

-- CreateIndex
CREATE INDEX "RiskEvent_riskLevel_idx" ON "RiskEvent"("riskLevel");

-- CreateIndex
CREATE INDEX "RiskEvent_createdWeek_createdYear_idx" ON "RiskEvent"("createdWeek", "createdYear");

-- CreateIndex
CREATE INDEX "RiskEventPart_riskEventId_idx" ON "RiskEventPart"("riskEventId");

-- CreateIndex
CREATE INDEX "RiskEventPart_partNumberId_idx" ON "RiskEventPart"("partNumberId");

-- CreateIndex
CREATE INDEX "RiskEventPart_status_idx" ON "RiskEventPart"("status");

-- CreateIndex
CREATE INDEX "RiskEventPart_logisticsStatus_idx" ON "RiskEventPart"("logisticsStatus");

-- CreateIndex
CREATE UNIQUE INDEX "RiskEventPart_riskEventId_partNumberId_key" ON "RiskEventPart"("riskEventId", "partNumberId");

-- CreateIndex
CREATE INDEX "RiskStatusHistory_riskEventId_idx" ON "RiskStatusHistory"("riskEventId");

-- CreateIndex
CREATE INDEX "RiskStatusHistory_changedBy_idx" ON "RiskStatusHistory"("changedBy");

-- CreateIndex
CREATE INDEX "RiskStatusHistory_changedAt_idx" ON "RiskStatusHistory"("changedAt");

-- AddForeignKey
ALTER TABLE "RiskEvent" ADD CONSTRAINT "RiskEvent_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskActionPlan" ADD CONSTRAINT "RiskActionPlan_riskEventId_fkey" FOREIGN KEY ("riskEventId") REFERENCES "RiskEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskActionPlan" ADD CONSTRAINT "RiskActionPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskActionPlan" ADD CONSTRAINT "RiskActionPlan_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
