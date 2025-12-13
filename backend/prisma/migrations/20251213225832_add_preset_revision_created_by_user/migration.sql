-- CreateIndex
CREATE INDEX "FormPresetRevision_createdByUserId_idx" ON "FormPresetRevision"("createdByUserId");

-- AddForeignKey
ALTER TABLE "FormPresetRevision" ADD CONSTRAINT "FormPresetRevision_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
