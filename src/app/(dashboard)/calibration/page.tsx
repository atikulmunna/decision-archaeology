import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { summarizeCalibration } from '@/lib/calibration'
import { CalibrationView } from '@/components/calibration/CalibrationView'
import { getOrCreateDbUser } from '@/lib/db-user'
import { APP_ROUTES } from '@/lib/routes'

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
    include: { outcomes: true, forecasts: { orderBy: { position: 'asc' } } },
  })

  return <CalibrationView eyebrow="Your record" data={summarizeCalibration(records, new Date())} routes={APP_ROUTES} />
}
