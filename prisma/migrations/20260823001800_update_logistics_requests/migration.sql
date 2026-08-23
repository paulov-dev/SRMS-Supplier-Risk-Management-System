/*
  Warnings:

  - The values [PENDING] on the enum `RiskPartLogisticsStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `assignedTo` on the `LogisticsRequest` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `LogisticsRequest` table. All the data in the column will be lost.
  - You are about to drop the column `requestedBy` on the `LogisticsRequest` table. All the data in the column will be lost.
  - The `status` column on the `LogisticsRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updatedAt` to the `LogisticsBuffer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requestedById` to the `LogisticsRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `riskEventPartId` to the `LogisticsRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `LogisticsRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `LogisticsRequest` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LogisticsRequestType" AS ENUM ('BOOK_INCLUSION', 'BUFFER_CALCULATION');

-- CreateEnum
CREATE TYPE "LogisticsRequestStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "LogisticsPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterEnum
BEGIN;
CREATE TYPE "RiskPartLogisticsStatus_new" AS ENUM ('NOT_REQUESTED', 'REQUESTED', 'IN_LOGISTICS', 'APPROVED', 'REJECTED');
ALTER TABLE "public"."RiskEventPart" ALTER COLUMN "logisticsStatus" DROP DEFAULT;
ALTER TABLE "RiskEventPart" ALTER COLUMN "logisticsStatus" TYPE "RiskPartLogisticsStatus_new" USING ("logisticsStatus"::text::"RiskPartLogisticsStatus_new");
ALTER TABLE "RiskEventPartHistory" ALTER COLUMN "oldLogisticsStatus" TYPE "RiskPartLogisticsStatus_new" USING ("oldLogisticsStatus"::text::"RiskPartLogisticsStatus_new");
ALTER TABLE "RiskEventPartHistory" ALTER COLUMN "newLogisticsStatus" TYPE "RiskPartLogisticsStatus_new" USING ("newLogisticsStatus"::text::"RiskPartLogisticsStatus_new");
ALTER TYPE "RiskPartLogisticsStatus" RENAME TO "RiskPartLogisticsStatus_old";
ALTER TYPE "RiskPartLogisticsStatus_new" RENAME TO "RiskPartLogisticsStatus";
DROP TYPE "public"."RiskPartLogisticsStatus_old";
ALTER TABLE "RiskEventPart" ALTER COLUMN "logisticsStatus" SET DEFAULT 'NOT_REQUESTED';
COMMIT;

-- DropForeignKey
ALTER TABLE "LogisticsRequest" DROP CONSTRAINT "LogisticsRequest_assignedTo_fkey";

-- DropForeignKey
ALTER TABLE "LogisticsRequest" DROP CONSTRAINT "LogisticsRequest_requestedBy_fkey";

-- DropForeignKey
ALTER TABLE "LogisticsRequest" DROP CONSTRAINT "LogisticsRequest_riskEventId_fkey";

-- DropIndex
DROP INDEX "LogisticsRequest_assignedTo_idx";

-- DropIndex
DROP INDEX "LogisticsRequest_requestedBy_idx";

-- AlterTable
ALTER TABLE "LogisticsBuffer" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "LogisticsRequest" DROP COLUMN "assignedTo",
DROP COLUMN "notes",
DROP COLUMN "requestedBy",
ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "calculatedQuantity" INTEGER,
ADD COLUMN     "canceledAt" TIMESTAMP(3),
ADD COLUMN     "coverageEndDate" TIMESTAMP(3),
ADD COLUMN     "coverageStartDate" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "cutoffDate" TIMESTAMP(3),
ADD COLUMN     "cutoffReference" TEXT,
ADD COLUMN     "newPartNumber" TEXT,
ADD COLUMN     "oldPartNumber" TEXT,
ADD COLUMN     "priority" "LogisticsPriority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "replacementReason" TEXT,
ADD COLUMN     "requestNotes" TEXT,
ADD COLUMN     "requestedById" TEXT NOT NULL,
ADD COLUMN     "requestedQuantity" INTEGER,
ADD COLUMN     "responseNotes" TEXT,
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "riskEventPartId" TEXT NOT NULL,
ADD COLUMN     "type" "LogisticsRequestType" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "LogisticsRequestStatus" NOT NULL DEFAULT 'PENDING';

-- DropEnum
DROP TYPE "LogisticsStatus";

-- CreateIndex
CREATE INDEX "LogisticsRequest_riskEventPartId_idx" ON "LogisticsRequest"("riskEventPartId");

-- CreateIndex
CREATE INDEX "LogisticsRequest_type_idx" ON "LogisticsRequest"("type");

-- CreateIndex
CREATE INDEX "LogisticsRequest_status_idx" ON "LogisticsRequest"("status");

-- CreateIndex
CREATE INDEX "LogisticsRequest_priority_idx" ON "LogisticsRequest"("priority");

-- CreateIndex
CREATE INDEX "LogisticsRequest_requestedById_idx" ON "LogisticsRequest"("requestedById");

-- CreateIndex
CREATE INDEX "LogisticsRequest_assignedToId_idx" ON "LogisticsRequest"("assignedToId");

-- CreateIndex
CREATE INDEX "LogisticsRequest_reviewedById_idx" ON "LogisticsRequest"("reviewedById");

-- CreateIndex
CREATE INDEX "LogisticsRequest_reviewedAt_idx" ON "LogisticsRequest"("reviewedAt");

-- AddForeignKey
ALTER TABLE "LogisticsRequest" ADD CONSTRAINT "LogisticsRequest_riskEventId_fkey" FOREIGN KEY ("riskEventId") REFERENCES "RiskEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsRequest" ADD CONSTRAINT "LogisticsRequest_riskEventPartId_fkey" FOREIGN KEY ("riskEventPartId") REFERENCES "RiskEventPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsRequest" ADD CONSTRAINT "LogisticsRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsRequest" ADD CONSTRAINT "LogisticsRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsRequest" ADD CONSTRAINT "LogisticsRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
