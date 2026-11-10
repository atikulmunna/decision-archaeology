-- AlterTable
-- Seals (src/lib/seal.ts): existing finalized records are sealed by `npm run seal:backfill`, not here.
ALTER TABLE "decision_records" ADD COLUMN "sealHash" TEXT,
ADD COLUMN "sealedAt" TIMESTAMP(3);
