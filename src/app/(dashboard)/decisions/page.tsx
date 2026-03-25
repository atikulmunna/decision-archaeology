import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getDecisions, getDraftDecisions } from '@/lib/decisions'
import { DecisionCard } from '@/components/decisions/DecisionCard'
import { DraftDecisionCard } from '@/components/decisions/DraftDecisionCard'
import { FilterBar } from '@/components/decisions/FilterBar'
import Link from 'next/link'
import type { DomainTag } from '@prisma/client'
import { BIAS_REPORT_THRESHOLD, getMilestoneMessage } from '@/lib/onboarding'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Decisions — Decision Archaeology',
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
  const { userId } = await auth()
  if (!userId) return null

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return null

  const params = await searchParams
  const { q, domain, outcome, dateFrom, dateTo, minConfidence: minConfidenceStr, tag, page: pageStr } = params
  const page = Math.max(1, parseInt(pageStr ?? '1'))
  const minConfidence = minConfidenceStr ? Math.max(1, Math.min(10, parseInt(minConfidenceStr))) : undefined

  const { records, total } = await getDecisions(dbUser.id, {
    q,
    domain: domain as DomainTag | undefined,
    outcome: outcome as 'pending' | 'has' | 'positive' | 'negative' | 'expected' | 'too_early' | undefined,
    dateFrom,
    dateTo,
    minConfidence,
    tag,
    page,
    limit: 20,
  })
  const drafts = await getDraftDecisions(dbUser.id, 3)

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
  const allCount = await prisma.decisionRecord.count({
    where: { userId: dbUser.id, isDraft: false },
  })
  const progressPct = Math.min(100, Math.round((allCount / BIAS_REPORT_THRESHOLD) * 100))
  const milestone = getMilestoneMessage(allCount)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Decisions</h1>
          <p className="text-sm text-gray-400">{total} record{total !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/decisions/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
        >
          + New Decision
        </Link>
      </div>

      {/* Milestone bar */}
      {allCount < BIAS_REPORT_THRESHOLD && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-medium text-indigo-700">
              🧠 {allCount}/{BIAS_REPORT_THRESHOLD} decisions toward your first Bias Report
            </p>
            <span className="text-xs font-semibold text-indigo-500">{progressPct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-indigo-200">
            <div
              className="h-2 rounded-full bg-indigo-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {milestone && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-900">{milestone.title}</p>
              <p className="mt-1 text-sm text-amber-800">{milestone.body}</p>
            </div>
            <Link
              href={milestone.href}
              className="inline-flex rounded-lg bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
            >
              {milestone.cta}
            </Link>
          </div>
        </div>
      )}

      {drafts.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                Drafts
              </h2>
              <p className="text-sm text-gray-500">
                Pick up where you left off before you lock anything in.
              </p>
            </div>
            <Link
              href="/decisions/new"
              className="text-sm font-medium text-amber-700 transition-colors hover:text-amber-800"
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

      {/* Filters */}
      <Suspense fallback={null}>
        <FilterBar />
      </Suspense>

      {/* Decision list */}
      {records.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <span className="text-4xl">🏺</span>
          {allCount === 0 && drafts.length === 0 ? (
            <>
              <p className="mt-3 font-semibold text-gray-700">No decisions yet</p>
              <p className="mt-1 text-sm text-gray-400">
                Start logging decisions to build your reasoning archive.
              </p>
              <Link
                href="/decisions/new"
                className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Log your first decision
              </Link>
            </>
          ) : (
            <>
              <p className="mt-3 font-semibold text-gray-700">No results</p>
              <p className="mt-1 text-sm text-gray-400">Try adjusting your filters or search query.</p>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {records.map((record) => (
            <DecisionCard key={record.id} decision={record} searchQuery={q} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={hrefForPage(page - 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              ← Previous
            </Link>
          )}
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={hrefForPage(page + 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
