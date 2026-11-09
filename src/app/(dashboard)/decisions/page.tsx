import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getDecisions, getDraftDecisions } from '@/lib/decisions'
import { DecisionCard } from '@/components/decisions/DecisionCard'
import { DraftDecisionCard } from '@/components/decisions/DraftDecisionCard'
import { FilterBar } from '@/components/decisions/FilterBar'
import { ExportImportPanel } from '@/components/decisions/ExportImportPanel'
import Link from 'next/link'
import { Archive, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
import { EmptyState } from '@/components/ui/EmptyState'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { PageHeader } from '@/components/ui/PageHeader'
import { archiveEmptyState } from '@/lib/archive-view'
import type { DomainTag } from '@prisma/client'
import { BIAS_REPORT_THRESHOLD, getMilestoneMessage } from '@/lib/onboarding'
import { getOrCreateDbUser } from '@/lib/db-user'
import { logError } from '@/lib/observability'
import { createTimer } from '@/lib/timing'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Decisions | Decision Archaeology',
}

type SearchParams = Promise<{
  q?: string
  domain?: string
  outcome?: string
  dateFrom?: string
  dateTo?: string
  minConfidence?: string
  tag?: string
  page?: string
}>

export default async function DecisionsPage({ searchParams }: { searchParams: SearchParams }) {
  const timer = createTimer('page.dashboard.decisions')
  const { userId } = await auth()
  if (!userId) return null

  const [dbUser, params] = await Promise.all([
    getOrCreateDbUser(userId),
    searchParams,
  ])
  if (!dbUser) return null

  const { q, domain, outcome, dateFrom, dateTo, minConfidence: minConfidenceStr, tag, page: pageStr } = params
  const page = Math.max(1, parseInt(pageStr ?? '1'))
  const minConfidence = minConfidenceStr ? Math.max(1, Math.min(10, parseInt(minConfidenceStr))) : undefined

  let records: Awaited<ReturnType<typeof getDecisions>>['records'] = []
  let total = 0
  let drafts: Awaited<ReturnType<typeof getDraftDecisions>> = []
  let allCount = 0
  let archiveError = false

  try {
    const result = await Promise.all([
      getDecisions(dbUser.id, {
        q,
        domain: domain as DomainTag | undefined,
        outcome: outcome as 'pending' | 'has' | 'positive' | 'negative' | 'expected' | 'too_early' | undefined,
        dateFrom,
        dateTo,
        minConfidence,
        tag,
        page,
        limit: 20,
      }),
      getDraftDecisions(dbUser.id, 3),
      prisma.decisionRecord.count({
        where: { userId: dbUser.id, isDraft: false },
      }),
    ])

    records = result[0].records
    total = result[0].total
    drafts = result[1]
    allCount = result[2]
  } catch (error) {
    archiveError = true
    await logError('[decisions-page] Failed to load archive page', error, {
      userId,
      page,
      query: q ?? null,
    })
  }

  const totalPages = Math.ceil(total / 20)
  const pageParams = new URLSearchParams()
  if (q) pageParams.set('q', q)
  if (domain) pageParams.set('domain', domain)
  if (outcome) pageParams.set('outcome', outcome)
  if (dateFrom) pageParams.set('dateFrom', dateFrom)
  if (dateTo) pageParams.set('dateTo', dateTo)
  if (typeof minConfidence === 'number' && !Number.isNaN(minConfidence)) {
    pageParams.set('minConfidence', String(minConfidence))
  }
  if (tag) pageParams.set('tag', tag)

  function hrefForPage(nextPage: number) {
    const next = new URLSearchParams(pageParams.toString())
    next.set('page', String(nextPage))
    return `?${next.toString()}`
  }

  // Milestone progress toward first Bias Report
  const progressPct = Math.min(100, Math.round((allCount / BIAS_REPORT_THRESHOLD) * 100))
  const milestone = getMilestoneMessage(allCount)
  timer.end({ total, draftCount: drafts.length, archiveError })

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Your record"
        title="Archive"
        meta={`${allCount} sealed${drafts.length > 0 ? ` · ${drafts.length} draft${drafts.length === 1 ? '' : 's'}` : ''}`}
        actions={<Button href="/decisions/new">Log decision</Button>}
      />

      {allCount < BIAS_REPORT_THRESHOLD && (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-ink-2">
              {allCount} of {BIAS_REPORT_THRESHOLD} decisions toward your first bias report
            </p>
            <span className="font-mono text-[11px] text-muted">{progressPct}%</span>
          </div>
          <div className="h-px w-full bg-rule">
            <div className="h-px bg-ink" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {milestone && (
        <Callout tone="success" title={milestone.title}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{milestone.body}</span>
            <Button href={milestone.href} size="sm" variant="secondary">
              {milestone.cta}
            </Button>
          </div>
        </Callout>
      )}

      {archiveError && (
        <Callout tone="danger" title="The archive could not load completely">
          You can still create a new decision while the archive data is retried.
        </Callout>
      )}

      {drafts.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <Eyebrow>Drafts</Eyebrow>
              <p className="mt-1 text-sm text-ink-2">Pick up where you left off before you seal anything.</p>
            </div>
            <Link
              href="/decisions/new"
              className="font-mono text-[11px] uppercase tracking-[0.09em] text-signal-ink hover:text-ink"
            >
              Start another draft
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {drafts.map((draft) => (
              <DraftDecisionCard key={draft.id} decision={draft} />
            ))}
          </div>
        </section>
      )}

      <Suspense fallback={null}>
        <FilterBar />
      </Suspense>

      {records.length === 0 ? (
        {
          'first-run': (
            <EmptyState
              icon={Archive}
              title="No decisions yet"
              description="Start logging decisions to build your reasoning archive."
              action={<Button href="/decisions/new">Log your first decision</Button>}
            />
          ),
          'drafts-only': (
            <EmptyState
              icon={Archive}
              title="Nothing sealed yet"
              description="Finish a draft above, or log a new decision, and it will appear here once sealed."
            />
          ),
          'no-results': (
            <EmptyState icon={SearchX} title="No results" description="Try adjusting your filters or search query." />
          ),
        }[archiveEmptyState({ sealedCount: allCount, draftCount: drafts.length, hasFilters: pageParams.toString() !== '' })]
      ) : (
        <div className="-mt-4 flex flex-col">
          {records.map((record) => (
            <DecisionCard key={record.id} decision={record} searchQuery={q} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-3">
          {page > 1 && (
            <Button href={hrefForPage(page - 1)} variant="secondary" size="sm">
              Previous
            </Button>
          )}
          <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Button href={hrefForPage(page + 1)} variant="secondary" size="sm">
              Next
            </Button>
          )}
        </nav>
      )}

      <ExportImportPanel canImport={dbUser.tier === 'POWER'} />
    </div>
  )
}
