import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import {
  computeCalibrationScore,
  computeCalibrationByDomain,
  getClosedPredictedDecisions,
} from '@/lib/calibration'
import { CalibrationWidget } from '@/components/calibration/CalibrationWidget'
import { getOrCreateDbUser } from '@/lib/db-user'
import { PageHeader } from '@/components/ui/PageHeader'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Calibration Score | Decision Archaeology',
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
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Your record"
        title="Calibration"
        meta="How accurately your predictions match your actual outcomes"
      />
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
