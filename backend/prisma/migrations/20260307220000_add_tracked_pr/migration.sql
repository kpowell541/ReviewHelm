-- CreateTable
CREATE TABLE "TrackedPR" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'needs-review',
    "role" TEXT NOT NULL DEFAULT 'reviewer',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "size" TEXT,
    "repo" TEXT,
    "prNumber" INTEGER,
    "prAuthor" TEXT,
    "dependencies" JSONB NOT NULL DEFAULT '[]',
    "ciPassing" TEXT,
    "linkedSessionId" TEXT,
    "notes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "lastReviewedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackedPR_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrackedPR_userId_status_idx" ON "TrackedPR"("userId", "status");

-- CreateIndex
CREATE INDEX "TrackedPR_userId_updatedAt_idx" ON "TrackedPR"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "TrackedPR" ADD CONSTRAINT "TrackedPR_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
