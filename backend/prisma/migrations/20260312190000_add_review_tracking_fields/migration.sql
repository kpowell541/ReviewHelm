-- AlterTable
ALTER TABLE "TrackedPR" ADD COLUMN "selfReviewed" BOOLEAN,
ADD COLUMN "reviewRoundCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "changesEverNeeded" BOOLEAN,
ADD COLUMN "reReviewed" BOOLEAN;
