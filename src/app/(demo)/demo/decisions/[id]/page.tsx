import { notFound } from 'next/navigation'
import { DecisionDetail } from '@/components/decisions/DecisionDetail'
import { DecisionPageBar } from '@/components/decisions/DecisionPageBar'
import { getDemoDecision } from '@/lib/demo/queries'
import { DEMO_ROUTES } from '@/lib/routes'

type Params = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Params) {
  const record = getDemoDecision((await params).id)
  return { title: record ? `${record.title} | Demo archive` : 'Decision Not Found' }
}

export default async function DemoDecisionPage({ params }: Params) {
  const record = getDemoDecision((await params).id)
  if (!record) notFound()

  return (
    <div className="flex flex-col gap-6">
      <DecisionPageBar backHref={DEMO_ROUTES.archive} />
      <DecisionDetail decision={record} readOnly timeZone="UTC" />
    </div>
  )
}
