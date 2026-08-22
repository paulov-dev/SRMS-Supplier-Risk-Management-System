-- CreateTable
CREATE TABLE "VehicleFamily" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleModel" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartNumberVehicleApplication" (
    "id" TEXT NOT NULL,
    "partNumberId" TEXT NOT NULL,
    "vehicleModelId" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartNumberVehicleApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskEventPartApplication" (
    "id" TEXT NOT NULL,
    "riskEventPartId" TEXT NOT NULL,
    "partNumberVehicleApplicationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskEventPartApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleFamily_name_key" ON "VehicleFamily"("name");

-- CreateIndex
CREATE INDEX "VehicleFamily_name_idx" ON "VehicleFamily"("name");

-- CreateIndex
CREATE INDEX "VehicleFamily_isActive_idx" ON "VehicleFamily"("isActive");

-- CreateIndex
CREATE INDEX "VehicleModel_familyId_idx" ON "VehicleModel"("familyId");

-- CreateIndex
CREATE INDEX "VehicleModel_code_idx" ON "VehicleModel"("code");

-- CreateIndex
CREATE INDEX "VehicleModel_isActive_idx" ON "VehicleModel"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleModel_familyId_code_key" ON "VehicleModel"("familyId", "code");

-- CreateIndex
CREATE INDEX "PartNumberVehicleApplication_partNumberId_idx" ON "PartNumberVehicleApplication"("partNumberId");

-- CreateIndex
CREATE INDEX "PartNumberVehicleApplication_vehicleModelId_idx" ON "PartNumberVehicleApplication"("vehicleModelId");

-- CreateIndex
CREATE INDEX "PartNumberVehicleApplication_validTo_idx" ON "PartNumberVehicleApplication"("validTo");

-- CreateIndex
CREATE INDEX "PartNumberVehicleApplication_isActive_idx" ON "PartNumberVehicleApplication"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PartNumberVehicleApplication_partNumberId_vehicleModelId_va_key" ON "PartNumberVehicleApplication"("partNumberId", "vehicleModelId", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "RiskEventPartApplication_riskEventPartId_idx" ON "RiskEventPartApplication"("riskEventPartId");

-- CreateIndex
CREATE INDEX "RiskEventPartApplication_partNumberVehicleApplicationId_idx" ON "RiskEventPartApplication"("partNumberVehicleApplicationId");

-- CreateIndex
CREATE UNIQUE INDEX "RiskEventPartApplication_riskEventPartId_partNumberVehicleA_key" ON "RiskEventPartApplication"("riskEventPartId", "partNumberVehicleApplicationId");

-- AddForeignKey
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "VehicleFamily"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartNumberVehicleApplication" ADD CONSTRAINT "PartNumberVehicleApplication_partNumberId_fkey" FOREIGN KEY ("partNumberId") REFERENCES "PartNumber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartNumberVehicleApplication" ADD CONSTRAINT "PartNumberVehicleApplication_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "VehicleModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskEventPartApplication" ADD CONSTRAINT "RiskEventPartApplication_riskEventPartId_fkey" FOREIGN KEY ("riskEventPartId") REFERENCES "RiskEventPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskEventPartApplication" ADD CONSTRAINT "RiskEventPartApplication_partNumberVehicleApplicationId_fkey" FOREIGN KEY ("partNumberVehicleApplicationId") REFERENCES "PartNumberVehicleApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
