import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import {
  computeCalibrationScore,
  computeCalibrationByDomain,
  getClosedPredictedDecisions,
} from '@/lib/calibration'
import { CalibrationWidget } from '@/components/calibration/CalibrationWidget'
import { getOrCreateDbUser } from '@/lib/db-user'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Calibration Score — Decision Archaeology',
}

export default async function CalibrationPage() {
  const { userId } = await auth()
  if (!userId) return null

  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return null

  const records = await prisma.decisionRecord.findMany({
    where: { userId: dbUser.id, isDraft: false },
    include: { outcomes: true },
  })

  const score = computeCalibrationScore(records)
  const byDomain = computeCalibrationByDomain(records)
  const closedDecisions = getClosedPredictedDecisions(records).length

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
