import { Suspense } from 'react'
import Link from 'next/link'
import type { DecisionRecord, OutcomeUpdate } from '@prisma/client'
import { Archive, SearchX } from 'lucide-react'
import { DecisionCard } from '@/components/decisions/DecisionCard'
import { DraftDecisionCard } from '@/components/decisions/DraftDecisionCard'
import { ExportImportPanel } from '@/components/decisions/ExportImportPanel'
import { FilterBar } from '@/components/decisions/FilterBar'
import { Button } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
import { EmptyState } from '@/components/ui/EmptyState'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { PageHeader } from '@/components/ui/PageHeader'
import { archiveEmptyState } from '@/lib/archive-view'
import { BIAS_REPORT_THRESHOLD, getMilestoneMessage } from '@/lib/onboarding'
import type { AppRoutes } from '@/lib/routes'

export type ArchiveViewProps = {
  mode: 'owner' | 'demo'
  routes: AppRoutes
  records: Array<DecisionRecord & { outcomes: OutcomeUpdate[] }>
  total: number
  allCount: number
  page: number
  pageParams: string
  hasFilters: boolean
  searchQuery?: string
  drafts?: DecisionRecord[]
  archiveError?: boolean
  canImport?: boolean
  intro?: string
}

const PAGE_SIZE = 20

/** The archive page body, shared by the signed-in archive and the public demo. */
export function ArchiveView({
  mode,
  routes,
  records,
  total,
  allCount,
  page,
  pageParams,
  hasFilters,
  searchQuery,
  drafts = [],
  archiveError = false,
  canImport = false,
  intro,
}: ArchiveViewProps) {
  const isOwner = mode === 'owner'
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const hrefForPage = (nextPage: number) => `?${pageParams ? `${pageParams}&` : ''}page=${nextPage}`

  const progressPct = Math.min(100, Math.round((allCount / BIAS_REPORT_THRESHOLD) * 100))
  const milestone = isOwner ? getMilestoneMessage(allCount) : null
  const visibleDrafts = isOwner ? drafts : []

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={isOwner ? 'Your record' : 'Demo archive'}
        title="Archive"
        meta={`${allCount} sealed${visibleDrafts.length > 0 ? ` · ${visibleDrafts.length} draft${visibleDrafts.length === 1 ? '' : 's'}` : ''}`}
        actions={isOwner ? <Button href="/decisions/new">Log decision</Button> : undefined}
      />

      {intro && <p className="-mt-4 max-w-2xl text-sm leading-relaxed text-ink-2">{intro}</p>}

      {isOwner && allCount < BIAS_REPORT_THRESHOLD && (
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

      {visibleDrafts.length > 0 && (
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
            {visibleDrafts.map((draft) => (
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
              action={isOwner ? <Button href="/decisions/new">Log your first decision</Button> : undefined}
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
        }[archiveEmptyState({ sealedCount: allCount, draftCount: visibleDrafts.length, hasFilters })]
      ) : (
        <div className="-mt-4 flex flex-col">
          {records.map((record) => (
            <DecisionCard key={record.id} decision={record} searchQuery={searchQuery} routes={routes} />
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

      {isOwner && <ExportImportPanel canImport={canImport} />}
    </div>
  )
}
