import { notFound } from 'next/navigation'
import { DecisionDetail } from '@/components/decisions/DecisionDetail'
import { DecisionPageBar } from '@/components/decisions/DecisionPageBar'
import { getDemoAssumptionReviews, getDemoDecision } from '@/lib/demo/queries'
import { defaultDetailView, parseDetailView } from '@/lib/detail-view'
import { splitAroundSeal } from '@/lib/field-notes'
import { DEMO_NOW } from '@/lib/demo/clock'
import { DEMO_ROUTES } from '@/lib/routes'

type Params = { params: Promise<{ id: string }> }
type PageProps = Params & { searchParams?: Promise<{ view?: string | string[] }> }

export async function generateMetadata({ params }: Params) {
  const record = getDemoDecision((await params).id)
  return { title: record ? `${record.title} | Demo archive` : 'Decision Not Found' }
}

export default async function DemoDecisionPage({ params, searchParams }: PageProps) {
  const record = getDemoDecision((await params).id)
  if (!record) notFound()
  const reviews = getDemoAssumptionReviews(record.id)
  const initialView = parseDetailView(
    (await searchParams)?.view,
    defaultDetailView(
      record.outcomes.length > 0,
      reviews.length > 0,
      record.forecasts.some((forecast) => forecast.resolution !== null),
      splitAroundSeal(record.fieldNotes, record.createdAt).after.length > 0
    )
  )

  return (
    <div className="flex flex-col gap-6">
      <DecisionPageBar backHref={DEMO_ROUTES.archive} />
      <DecisionDetail
        decision={record}
        readOnly
        timeZone="UTC"
        tamperTest
        now={DEMO_NOW}
        reviews={reviews}
        initialView={initialView}
      />
    </div>
  )
}
