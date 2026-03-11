import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { computeCalibrationScore, computeCalibrationByDomain } from '@/lib/calibration'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Fetch all records with outcomes that have predictions
  const records = await prisma.decisionRecord.findMany({
    where: { userId: dbUser.id, isDraft: false },
    include: { outcomes: true },
  })

  const allOutcomes = records.flatMap((r) => r.outcomes)
  const overallScore = computeCalibrationScore(allOutcomes)
  const byDomain = computeCalibrationByDomain(records)

  const closedCount = allOutcomes.filter(
    (o) => o.outcomeRating !== 'TOO_EARLY_TO_TELL'
  ).length

  return NextResponse.json({
    score: overallScore,
    byDomain,
    closedDecisions: closedCount,
    totalDecisions: records.length,
    minRequired: 5,
  })
}
