import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { BiasReportView } from '@/components/ai/BiasReportView'
import { demoReportProvenance, getDemoReport } from '@/lib/demo/report'
import { DEMO_ROUTES } from '@/lib/routes'

type Params = { params: Promise<{ id: string }> }

export const metadata = { title: 'Demo report | Decision Archaeology' }

export default async function DemoReportPage({ params }: Params) {
  const report = getDemoReport((await params).id)
  if (!report) notFound()

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={DEMO_ROUTES.reports}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.09em] text-muted hover:text-ink"
      >
        <ArrowLeft aria-hidden="true" size={12} strokeWidth={1.5} />
        Reports
      </Link>
      <BiasReportView report={report} readOnly provenance={demoReportProvenance()} />
    </div>
  )
}
