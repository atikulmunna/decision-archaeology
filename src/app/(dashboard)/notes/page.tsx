import { auth } from '@clerk/nextjs/server'
import { NotesView } from '@/components/notes/NotesView'
import { getOrCreateDbUser } from '@/lib/db-user'
import { parseBefore } from '@/lib/field-notes'
import { listDecisionOptions, listNotes } from '@/lib/field-notes-db'
import { APP_ROUTES } from '@/lib/routes'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Field Notes | Decision Archaeology' }

export default async function NotesPage({ searchParams }: { searchParams: Promise<{ before?: string | string[] }> }) {
  const { userId } = await auth()
  if (!userId) return null
  const dbUser = await getOrCreateDbUser(userId)
  if (!dbUser) return null

  const before = parseBefore((await searchParams).before)
  const [{ notes, olderCursor }, decisionOptions] = await Promise.all([
    listNotes(dbUser.id, { before, decisionHref: APP_ROUTES.decision }),
    listDecisionOptions(dbUser.id),
  ])

  return (
    <NotesView
      mode="owner"
      notes={notes}
      olderHref={olderCursor ? `?before=${encodeURIComponent(olderCursor)}` : null}
      decisionOptions={decisionOptions}
      decisionHrefPrefix={APP_ROUTES.decision('')}
    />
  )
}
