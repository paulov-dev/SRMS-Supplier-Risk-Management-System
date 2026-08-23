-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "activatedById" TEXT,
ALTER COLUMN "isActive" SET DEFAULT false;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_activatedById_fkey" FOREIGN KEY ("activatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
