-- AlterTable
ALTER TABLE "Preference"
ADD COLUMN IF NOT EXISTS "confidenceHistories" JSONB NOT NULL DEFAULT '{}';
