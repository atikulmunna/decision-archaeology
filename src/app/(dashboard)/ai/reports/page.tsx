import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { ReportsListView } from '@/components/ai/ReportsListView'
import { getOrCreateDbUser } from '@/lib/db-user'
import { APP_ROUTES } from '@/lib/routes'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Bias Reports | Decision Archaeology' }

export default async function ReportsPage() {
  const { userId } = await auth()
  if (!userId) return null

  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return null

  const reports = await prisma.biasReport.findMany({
    where: { userId: dbUser.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, createdAt: true, status: true, summary: true, decisionCount: true },
  })

  const decisionCount = await prisma.decisionRecord.count({
    where: { userId: dbUser.id, isDraft: false },
  })

  return <ReportsListView mode="owner" routes={APP_ROUTES} reports={reports} decisionCount={decisionCount} />
}
