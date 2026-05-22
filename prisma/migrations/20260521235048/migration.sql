/*
  Warnings:

  - A unique constraint covering the columns `[supplierCodeSap]` on the table `Supplier` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Supplier_supplierCodeSap_key" ON "Supplier"("supplierCodeSap");
