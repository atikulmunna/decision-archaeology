import { PageHeader } from '@/components/ui/PageHeader'
import type { LetterPeek } from '@/lib/revisit-summary'
import { RevisitFlow } from './RevisitFlow'
import type { RevisitData } from './revisit-data'

/** The revisit page body, shared by the signed-in page and the demo. Passes plain data only. */
export function RevisitView({ mode, data, letter, now }: { mode: 'owner' | 'demo'; data: RevisitData; letter: LetterPeek; now: Date }) {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow={`${data.catalogLabel} · Revisit`} title={data.title} meta="Look back at what you expected, and what happened." />
      <RevisitFlow mode={mode} data={data} letter={letter} now={now} />
    </div>
  )
}
