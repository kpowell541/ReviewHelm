-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ChecklistMode" AS ENUM ('review', 'polish');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('blocker', 'major', 'minor', 'nit');

-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('looks_good', 'needs_attention', 'na', 'skipped');

-- CreateEnum
CREATE TYPE "ClaudeModel" AS ENUM ('haiku', 'sonnet', 'opus');

-- CreateEnum
CREATE TYPE "AiFeature" AS ENUM ('learn', 'deep_dive', 'comment_drafter');

-- CreateEnum
CREATE TYPE "KeySource" AS ENUM ('byok', 'platform');

-- CreateEnum
CREATE TYPE "DiffSource" AS ENUM ('pasted', 'uploaded');

-- CreateEnum
CREATE TYPE "FeedbackOutcome" AS ENUM ('accepted', 'edited', 'rejected');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "supabaseUserId" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "aiModel" "ClaudeModel" NOT NULL DEFAULT 'sonnet',
    "defaultSeverityFilter" TEXT[] DEFAULT ARRAY['blocker', 'major', 'minor', 'nit']::TEXT[],
    "antiBiasMode" BOOLEAN NOT NULL DEFAULT true,
    "fontSize" TEXT NOT NULL DEFAULT 'medium',
    "codeBlockTheme" TEXT NOT NULL DEFAULT 'dark',
    "autoExportPdf" BOOLEAN NOT NULL DEFAULT false,
    "activeCommentStyleProfileId" TEXT,
    "monthlyBudgetUsd" DECIMAL(65,30) NOT NULL DEFAULT 40,
    "alertThresholds" INTEGER[] DEFAULT ARRAY[70, 85, 95]::INTEGER[],
    "hardStopAtBudget" BOOLEAN NOT NULL DEFAULT false,
    "autoDowngradeNearBudget" BOOLEAN NOT NULL DEFAULT true,
    "autoDowngradeThresholdPct" INTEGER NOT NULL DEFAULT 85,
    "cooldownSeconds" INTEGER NOT NULL DEFAULT 6,
    "lastAlertThreshold" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "keySource" "KeySource" NOT NULL DEFAULT 'byok',
    "kekVersion" INTEGER NOT NULL DEFAULT 1,
    "kmsKeyId" TEXT,
    "tokenHint" TEXT,
    "encryptedDek" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "lastRotatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "eventScope" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "details" JSONB NOT NULL DEFAULT '{}',
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "ChecklistMode" NOT NULL,
    "stackId" TEXT,
    "title" TEXT NOT NULL,
    "itemResponses" JSONB NOT NULL DEFAULT '{}',
    "sessionNotes" TEXT NOT NULL DEFAULT '',
    "completedAt" TIMESTAMP(3),
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "byModel" JSONB NOT NULL DEFAULT '{}',
    "byFeature" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "byModel" JSONB NOT NULL DEFAULT '{}',
    "byFeature" JSONB NOT NULL DEFAULT '{}',
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistVersion" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiffArtifact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "DiffSource" NOT NULL,
    "label" TEXT,
    "filename" TEXT,
    "content" TEXT NOT NULL,
    "lineCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiffArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentStyleProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "strictness" INTEGER NOT NULL DEFAULT 3,
    "verbosity" INTEGER NOT NULL DEFAULT 3,
    "includePraise" BOOLEAN NOT NULL DEFAULT false,
    "includeActionItems" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommentStyleProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "itemId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "model" "ClaudeModel" NOT NULL,
    "draftText" TEXT NOT NULL,
    "finalText" TEXT,
    "outcome" "FeedbackOutcome" NOT NULL,
    "editDistance" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseUserId_key" ON "User"("supabaseUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Preference_userId_key" ON "Preference"("userId");

-- CreateIndex
CREATE INDEX "ProviderKey_userId_idx" ON "ProviderKey"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderKey_userId_provider_key" ON "ProviderKey"("userId", "provider");

-- CreateIndex
CREATE INDEX "AuditEvent_eventType_createdAt_idx" ON "AuditEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_userId_createdAt_idx" ON "AuditEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Session_userId_mode_stackId_idx" ON "Session"("userId", "mode", "stackId");

-- CreateIndex
CREATE INDEX "Session_userId_isComplete_updatedAt_idx" ON "Session"("userId", "isComplete", "updatedAt");

-- CreateIndex
CREATE INDEX "UsageDay_userId_dateKey_idx" ON "UsageDay"("userId", "dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "UsageDay_userId_dateKey_key" ON "UsageDay"("userId", "dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "UsageSession_sessionId_key" ON "UsageSession"("sessionId");

-- CreateIndex
CREATE INDEX "UsageSession_userId_idx" ON "UsageSession"("userId");

-- CreateIndex
CREATE INDEX "ChecklistVersion_checklistId_idx" ON "ChecklistVersion"("checklistId");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistVersion_checklistId_version_key" ON "ChecklistVersion"("checklistId", "version");

-- CreateIndex
CREATE INDEX "DiffArtifact_userId_createdAt_idx" ON "DiffArtifact"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CommentStyleProfile_userId_createdAt_idx" ON "CommentStyleProfile"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CommentFeedback_userId_createdAt_idx" ON "CommentFeedback"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CommentFeedback_userId_outcome_model_createdAt_idx" ON "CommentFeedback"("userId", "outcome", "model", "createdAt");

-- AddForeignKey
ALTER TABLE "Preference" ADD CONSTRAINT "Preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderKey" ADD CONSTRAINT "ProviderKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageDay" ADD CONSTRAINT "UsageDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageSession" ADD CONSTRAINT "UsageSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageSession" ADD CONSTRAINT "UsageSession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiffArtifact" ADD CONSTRAINT "DiffArtifact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentStyleProfile" ADD CONSTRAINT "CommentStyleProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentFeedback" ADD CONSTRAINT "CommentFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
