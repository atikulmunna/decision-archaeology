-- AlterTable
ALTER TABLE "decision_records" ADD COLUMN     "catalogNumber" INTEGER;

-- Backfill: number each user's finalized and imported records by creation order (ties broken by id).
-- Mirrored by numberByCreation() in src/lib/catalog.ts.
UPDATE "decision_records" AS d
SET "catalogNumber" = n.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt", "id") AS rn
  FROM "decision_records"
  WHERE "isDraft" = false
) AS n
WHERE d."id" = n."id";

-- CreateIndex
CREATE UNIQUE INDEX "decision_records_userId_catalogNumber_key" ON "decision_records"("userId", "catalogNumber");
