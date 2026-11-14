import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getDecision } from '@/lib/decisions'
import { getOrCreateDbUser } from '@/lib/db-user'
import { openLetter } from '@/lib/letters'
import { getPendingCheckIn } from '@/lib/revisit-db'
import { APP_ROUTES } from '@/lib/routes'
import { RevisitView } from '@/components/revisit/RevisitView'
import { toRevisitData } from '@/components/revisit/revisit-data'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Revisit | Decision Archaeology' }

// The owner's guided revisit of a sealed decision. Opening this page is what opens the letter.
export default async function RevisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) return null
  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return null

  const record = await getDecision(dbUser.id, id)
  if (!record) notFound()

  const now = new Date()
  const [letter, pendingCheckIn] = await Promise.all([openLetter(dbUser.id, id, now), getPendingCheckIn(dbUser.id, id)])
  return <RevisitView mode="owner" data={toRevisitData(record, APP_ROUTES.decision(id), pendingCheckIn)} letter={letter} now={now} />
}
