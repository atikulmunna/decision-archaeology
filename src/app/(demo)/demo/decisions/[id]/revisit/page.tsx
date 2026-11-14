import { notFound } from 'next/navigation'
import { DecisionPageBar } from '@/components/decisions/DecisionPageBar'
import { RevisitView } from '@/components/revisit/RevisitView'
import { toRevisitData } from '@/components/revisit/revisit-data'
import { demoLetterPeek, getDemoAssumptionReviews, getDemoDecision } from '@/lib/demo/queries'
import { DEMO_NOW } from '@/lib/demo/clock'
import { DEMO_ROUTES } from '@/lib/routes'

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params) {
  const record = getDemoDecision((await params).id)
  return { title: record ? `Revisit: ${record.title} | Demo archive` : 'Decision Not Found' }
}

// A read-only revisit of Rowan's decision: nothing opens, writes or schedules.
export default async function DemoRevisitPage({ params }: Params) {
  const record = getDemoDecision((await params).id)
  if (!record) notFound()
  const data = toRevisitData({ ...record, assumptionReviews: getDemoAssumptionReviews(record.id) }, DEMO_ROUTES.decision(record.id), null)
  return (
    <div className="flex flex-col gap-6">
      <DecisionPageBar backHref={DEMO_ROUTES.decision(record.id)} />
      <RevisitView mode="demo" data={data} letter={demoLetterPeek(record.id)} now={DEMO_NOW} />
    </div>
  )
}
