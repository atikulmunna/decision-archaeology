-- AlterTable
ALTER TABLE "bias_reports" ADD COLUMN     "modelsUsed" TEXT[] DEFAULT ARRAY[]::TEXT[];
