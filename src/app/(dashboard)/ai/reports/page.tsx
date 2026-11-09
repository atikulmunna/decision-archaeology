import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { ScanSearch } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { GenerateReportButton } from '@/components/ai/GenerateReportButton'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Callout } from '@/components/ui/Callout'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { getOrCreateDbUser } from '@/lib/db-user'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Bias Reports | Decision Archaeology' }

const STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: 'neutral',
  RUNNING: 'neutral',
  COMPLETE: 'signal',
  FAILED: 'danger',
}

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

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="AI pattern reports"
        title="Reports"
        meta={`${reports.length} report${reports.length === 1 ? '' : 's'} · analyzed through OpenRouter`}
        actions={decisionCount >= 10 ? <GenerateReportButton /> : undefined}
      />

      {decisionCount < 10 && (
        <Callout tone="warning" title="Not enough history yet">
          Reports need at least 10 sealed decisions. You have {decisionCount} so far.
        </Callout>
      )}

      {reports.length === 0 ? (
        <EmptyState
          icon={ScanSearch}
          title="No reports yet"
          description="Reports look for recurring biases and assumptions across your archive."
        />
      ) : (
        <ul className="flex flex-col">
          {reports.map((report) => (
            <li key={report.id} className="border-b border-rule">
              <Link
                href={`/ai/reports/${report.id}`}
                className="grid gap-2 py-4 transition-colors duration-150 hover:bg-surface sm:grid-cols-[9rem_1fr_auto] sm:items-baseline sm:gap-6 sm:px-2"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted">
                  {new Date(report.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 font-display text-lg leading-snug text-ink">
                    {report.summary ?? (report.status === 'FAILED' ? 'Generation failed' : 'Generating...')}
                  </span>
                  <span className="mt-1 block font-mono text-[11px] text-muted">
                    {report.decisionCount} decisions analyzed
                  </span>
                </span>
                <Badge tone={STATUS_TONE[report.status] ?? 'neutral'}>
                  {report.status.charAt(0) + report.status.slice(1).toLowerCase()}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
