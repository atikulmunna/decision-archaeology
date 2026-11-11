-- CreateEnum
CREATE TYPE "AssumptionVerdict" AS ENUM ('HELD', 'PARTLY', 'DIDNT');

-- CreateTable
CREATE TABLE "assumption_reviews" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "itemHash" TEXT NOT NULL,
    "itemText" TEXT NOT NULL,
    "verdict" "AssumptionVerdict" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assumption_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assumption_reviews_decisionId_itemHash_key" ON "assumption_reviews"("decisionId", "itemHash");

-- AddForeignKey
ALTER TABLE "assumption_reviews" ADD CONSTRAINT "assumption_reviews_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "decision_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

