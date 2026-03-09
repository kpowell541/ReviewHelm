-- Add sync fields to Preference
ALTER TABLE "Preference" ADD COLUMN "bookmarks" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Preference" ADD COLUMN "templates" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Preference" ADD COLUMN "repoConfigs" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "TutorConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "lastAccessed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TutorConversation_userId_itemId_key" ON "TutorConversation"("userId", "itemId");

-- CreateIndex
CREATE INDEX "TutorConversation_userId_lastAccessed_idx" ON "TutorConversation"("userId", "lastAccessed");

-- AddForeignKey
ALTER TABLE "TutorConversation" ADD CONSTRAINT "TutorConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
