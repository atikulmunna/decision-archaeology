import { NotesView } from '@/components/notes/NotesView'
import { listDemoNotes } from '@/lib/demo/notes'
import { parseBefore } from '@/lib/field-notes'
import { DEMO_ROUTES } from '@/lib/routes'

export const metadata = { title: 'Demo field notes | Decision Archaeology' }

export default async function DemoNotesPage({ searchParams }: { searchParams: Promise<{ before?: string | string[] }> }) {
  const before = parseBefore((await searchParams).before)
  const { notes, olderCursor } = listDemoNotes({ before, decisionHref: DEMO_ROUTES.decision })
  return (
    <NotesView
      mode="demo"
      notes={notes}
      olderHref={olderCursor ? `?before=${encodeURIComponent(olderCursor)}` : null}
      decisionOptions={[]}
      decisionHrefPrefix={DEMO_ROUTES.decision('')}
    />
  )
}
