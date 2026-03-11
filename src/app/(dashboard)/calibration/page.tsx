import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { computeCalibrationScore, computeCalibrationByDomain } from '@/lib/calibration'
import { CalibrationWidget } from '@/components/calibration/CalibrationWidget'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Calibration Score — Decision Archaeology',
}

export default async function CalibrationPage() {
  const { userId } = await auth()
  if (!userId) return null

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return null

  const records = await prisma.decisionRecord.findMany({
    where: { userId: dbUser.id, isDraft: false },
    include: { outcomes: true },
  })

  const allOutcomes = records.flatMap((r) => r.outcomes)
  const score = computeCalibrationScore(allOutcomes)
  const byDomain = computeCalibrationByDomain(records)
  const closedDecisions = allOutcomes.filter(
    (o) => o.outcomeRating !== 'TOO_EARLY_TO_TELL'
  ).length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calibration Score</h1>
        <p className="mt-1 text-sm text-gray-400">
          How accurately your predictions match your actual outcomes.
        </p>
      </div>
      <CalibrationWidget
        data={{
          score,
          byDomain,
          closedDecisions,
          totalDecisions: records.length,
          minRequired: 5,
        }}
      />
    </div>
  )
}
