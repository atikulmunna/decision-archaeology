import { PageHeader } from '@/components/ui/PageHeader'
import type { FieldNoteView } from '@/lib/field-notes'
import { NotesFeed } from './NotesFeed'

/** The Field Notes page body, shared by the signed-in journal and the demo. Passes plain data only. */
export function NotesView({
  mode,
  notes,
  olderHref,
  decisionOptions,
  decisionHrefPrefix,
}: {
  mode: 'owner' | 'demo'
  notes: FieldNoteView[]
  olderHref: string | null
  decisionOptions: Array<{ id: string; label: string }>
  decisionHrefPrefix: string
}) {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={mode === 'demo' ? 'Demo archive' : 'Your journal'}
        title="Field Notes"
        meta="Quick, never-locked notes. Any of them can become a decision."
      />
      <NotesFeed
        initialNotes={notes}
        canEdit={mode === 'owner'}
        decisionOptions={decisionOptions}
        decisionHrefPrefix={decisionHrefPrefix}
        olderHref={olderHref}
      />
    </div>
  )
}
