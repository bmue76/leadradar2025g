-- CreateTable
CREATE TABLE "FormPreset" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "snapshotVersion" INTEGER NOT NULL DEFAULT 1,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FormPreset_tenantId_idx" ON "FormPreset"("tenantId");

-- CreateIndex
CREATE INDEX "FormPreset_tenantId_category_idx" ON "FormPreset"("tenantId", "category");

-- AddForeignKey
ALTER TABLE "FormPreset" ADD CONSTRAINT "FormPreset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
