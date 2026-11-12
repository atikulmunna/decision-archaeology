-- CreateEnum
CREATE TYPE "ForecastResolution" AS ENUM ('HAPPENED', 'DIDNT', 'VOID');

-- CreateTable
CREATE TABLE "forecasts" (
    "id" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "statement" TEXT NOT NULL,
    "probability" INTEGER NOT NULL,
    "resolveBy" TIMESTAMP(3) NOT NULL,
    "resolution" "ForecastResolution",
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "forecasts_decisionId_position_key" ON "forecasts"("decisionId", "position");

-- AddForeignKey
ALTER TABLE "forecasts" ADD CONSTRAINT "forecasts_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "decision_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

