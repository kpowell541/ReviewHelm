-- Add multi-stack and section selection support for sessions.
ALTER TABLE "Session"
ADD COLUMN IF NOT EXISTS "stackIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Session"
ADD COLUMN IF NOT EXISTS "selectedSections" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill existing rows so single stack sessions preserve their selected stack.
UPDATE "Session"
SET "stackIds" = ARRAY["stackId"]::TEXT[]
WHERE "stackId" IS NOT NULL
  AND COALESCE(array_length("stackIds", 1), 0) = 0;
