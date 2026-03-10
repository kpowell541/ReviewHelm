-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('free', 'pro', 'premium');

-- CreateEnum
CREATE TYPE "CreditEntryType" AS ENUM ('subscription_grant', 'topup', 'ai_usage', 'expiry', 'refund', 'admin_adjustment');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "tier" "SubscriptionTier" NOT NULL DEFAULT 'free',
ADD COLUMN "creditBalanceUsd" DECIMAL(10,4) NOT NULL DEFAULT 0,
ADD COLUMN "billingCycleStart" TIMESTAMP(3),
ADD COLUMN "trialEndsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CreditLedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CreditEntryType" NOT NULL,
    "amountUsd" DECIMAL(10,4) NOT NULL,
    "balanceAfter" DECIMAL(10,4) NOT NULL,
    "description" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditLedgerEntry_userId_createdAt_idx" ON "CreditLedgerEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditLedgerEntry_userId_type_createdAt_idx" ON "CreditLedgerEntry"("userId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "CreditLedgerEntry" ADD CONSTRAINT "CreditLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
