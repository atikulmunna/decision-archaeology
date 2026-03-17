/*
  Warnings:

  - You are about to drop the column `biases` on the `bias_reports` table. All the data in the column will be lost.
  - You are about to drop the column `calibrationByDomain` on the `bias_reports` table. All the data in the column will be lost.
  - You are about to drop the column `calibrationScore` on the `bias_reports` table. All the data in the column will be lost.
  - You are about to drop the column `flaggedByUser` on the `bias_reports` table. All the data in the column will be lost.
  - You are about to drop the column `generatedAt` on the `bias_reports` table. All the data in the column will be lost.
  - You are about to drop the column `jobId` on the `bias_reports` table. All the data in the column will be lost.
  - You are about to drop the column `recurringAssumptions` on the `bias_reports` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "BiasReportStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETE', 'FAILED');

-- DropIndex
DROP INDEX "bias_reports_jobId_key";

-- AlterTable
ALTER TABLE "bias_reports" DROP COLUMN "biases",
DROP COLUMN "calibrationByDomain",
DROP COLUMN "calibrationScore",
DROP COLUMN "flaggedByUser",
DROP COLUMN "generatedAt",
DROP COLUMN "jobId",
DROP COLUMN "recurringAssumptions",
ADD COLUMN     "calibrationInsight" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "findings" JSONB,
ADD COLUMN     "flaggedFindings" JSONB,
ADD COLUMN     "status" "BiasReportStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "summary" TEXT;
