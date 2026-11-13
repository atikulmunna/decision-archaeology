-- CreateEnum
CREATE TYPE "ChallengeOutcome" AS ENUM ('ASKED', 'SKIPPED', 'UNAVAILABLE');

-- AlterTable
ALTER TABLE "decision_records" ADD COLUMN     "challengeModel" TEXT,
ADD COLUMN     "challengeOutcome" "ChallengeOutcome";

-- CreateTable
CREATE TABLE "challenge_questions" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_attempts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "challenge_questions_decisionId_position_key" ON "challenge_questions"("decisionId", "position");

-- CreateIndex
CREATE INDEX "challenge_attempts_userId_createdAt_idx" ON "challenge_attempts"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "challenge_questions" ADD CONSTRAINT "challenge_questions_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "decision_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_attempts" ADD CONSTRAINT "challenge_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

