-- CreateTable
CREATE TABLE "field_notes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "decisionId" TEXT,
    "body" TEXT NOT NULL,
    "mood" INTEGER,
    "energy" INTEGER,
    "promoted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "field_notes_userId_createdAt_idx" ON "field_notes"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "field_notes_decisionId_idx" ON "field_notes"("decisionId");

-- AddForeignKey
ALTER TABLE "field_notes" ADD CONSTRAINT "field_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_notes" ADD CONSTRAINT "field_notes_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "decision_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

