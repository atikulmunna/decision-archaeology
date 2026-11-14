-- Remove reminders whose decision is gone, so the foreign key below can be added.
DELETE FROM "check_in_reminders" WHERE "decisionId" NOT IN (SELECT "id" FROM "decision_records");

-- AlterTable
ALTER TABLE "check_in_reminders" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "letters" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "sha256" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3),
    "emailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revisits" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revisits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "letters_decisionId_key" ON "letters"("decisionId");

-- CreateIndex
CREATE INDEX "letters_opensAt_idx" ON "letters"("opensAt");

-- CreateIndex
CREATE INDEX "revisits_decisionId_completedAt_idx" ON "revisits"("decisionId", "completedAt");

-- CreateIndex
CREATE INDEX "check_in_reminders_scheduledFor_idx" ON "check_in_reminders"("scheduledFor");

-- AddForeignKey
ALTER TABLE "check_in_reminders" ADD CONSTRAINT "check_in_reminders_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "decision_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letters" ADD CONSTRAINT "letters_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "decision_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisits" ADD CONSTRAINT "revisits_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "decision_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

