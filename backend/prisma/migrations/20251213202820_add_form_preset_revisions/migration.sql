-- CreateTable
CREATE TABLE "FormPresetRevision" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "presetId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" INTEGER,

    CONSTRAINT "FormPresetRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FormPresetRevision_tenantId_idx" ON "FormPresetRevision"("tenantId");

-- CreateIndex
CREATE INDEX "FormPresetRevision_presetId_idx" ON "FormPresetRevision"("presetId");

-- CreateIndex
CREATE INDEX "FormPresetRevision_presetId_createdAt_idx" ON "FormPresetRevision"("presetId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FormPresetRevision_presetId_version_key" ON "FormPresetRevision"("presetId", "version");

-- AddForeignKey
ALTER TABLE "FormPresetRevision" ADD CONSTRAINT "FormPresetRevision_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormPresetRevision" ADD CONSTRAINT "FormPresetRevision_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "FormPreset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
