/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `LogisticsRequest` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `LogisticsRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LogisticsRequest" ADD COLUMN     "code" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "LogisticsRequest_code_key" ON "LogisticsRequest"("code");
