-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('FREE', 'PRO', 'POWER');

-- CreateEnum
CREATE TYPE "DomainTag" AS ENUM ('CAREER', 'FINANCE', 'HEALTH', 'RELATIONSHIPS', 'CREATIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "OutcomeRating" AS ENUM ('MUCH_BETTER', 'SLIGHTLY_BETTER', 'AS_EXPECTED', 'SLIGHTLY_WORSE', 'MUCH_WORSE', 'TOO_EARLY_TO_TELL');

-- CreateEnum
CREATE TYPE "BiasSeverity" AS ENUM ('MILD', 'MODERATE', 'STRONG');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "tier" "Tier" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "alternatives" TEXT NOT NULL,
    "chosenOption" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "values" TEXT,
    "uncertainties" TEXT,
    "predictedOutcome" TEXT,
    "predictedTimeframe" TIMESTAMP(3),
    "confidenceLevel" INTEGER,
    "domainTag" "DomainTag",
    "customTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supplementaryNotes" TEXT,
    "isImported" BOOLEAN NOT NULL DEFAULT false,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decision_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outcome_updates" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "whatHappened" TEXT NOT NULL,
    "outcomeRating" "OutcomeRating" NOT NULL,
    "lessonsLearned" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outcome_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bias_reports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "biases" JSONB NOT NULL,
    "calibrationScore" DOUBLE PRECISION,
    "calibrationByDomain" JSONB,
    "recurringAssumptions" JSONB,
    "decisionCount" INTEGER NOT NULL,
    "flaggedByUser" BOOLEAN NOT NULL DEFAULT false,
    "jobId" TEXT,

    CONSTRAINT "bias_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaborator_shares" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collaborator_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaborator_comments" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collaborator_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correction_requests" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "correctedText" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "correction_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_in_reminders" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "snoozedUntil" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_in_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "bias_reports_jobId_key" ON "bias_reports"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "collaborator_shares_decisionId_collaboratorId_key" ON "collaborator_shares"("decisionId", "collaboratorId");

-- AddForeignKey
ALTER TABLE "decision_records" ADD CONSTRAINT "decision_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outcome_updates" ADD CONSTRAINT "outcome_updates_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "decision_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bias_reports" ADD CONSTRAINT "bias_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborator_shares" ADD CONSTRAINT "collaborator_shares_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "decision_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborator_shares" ADD CONSTRAINT "collaborator_shares_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborator_shares" ADD CONSTRAINT "collaborator_shares_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborator_comments" ADD CONSTRAINT "collaborator_comments_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "collaborator_shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "decision_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
