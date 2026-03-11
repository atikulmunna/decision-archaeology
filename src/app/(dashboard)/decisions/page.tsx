import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getDecisions } from '@/lib/decisions'
import { DecisionCard } from '@/components/decisions/DecisionCard'
import { FilterBar } from '@/components/decisions/FilterBar'
import Link from 'next/link'
import type { DomainTag } from '@prisma/client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Decisions — Decision Archaeology',
}

type SearchParams = Promise<{
  q?: string
  domain?: string
  outcome?: string
  page?: string
}>

export default async function DecisionsPage({ searchParams }: { searchParams: SearchParams }) {
  const { userId } = await auth()
  if (!userId) return null

  const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!dbUser) return null

  const params = await searchParams
  const { q, domain, outcome, page: pageStr } = params
  const page = Math.max(1, parseInt(pageStr ?? '1'))

  const hasOutcome =
    outcome === 'has' ? true : outcome === 'pending' ? false : undefined

  const { records, total } = await getDecisions(dbUser.id, {
    q,
    domain: domain as DomainTag | undefined,
    hasOutcome,
    page,
    limit: 20,
  })

  const totalPages = Math.ceil(total / 20)

  // Milestone progress toward first Bias Report
  const allCount = await prisma.decisionRecord.count({
    where: { userId: dbUser.id, isDraft: false },
  })
  const BIAS_THRESHOLD = 10
  const progressPct = Math.min(100, Math.round((allCount / BIAS_THRESHOLD) * 100))

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
      {allCount < BIAS_THRESHOLD && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-medium text-indigo-700">
              🧠 {allCount}/{BIAS_THRESHOLD} decisions toward your first Bias Report
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

      {/* Filters */}
      <Suspense fallback={null}>
        <FilterBar />
      </Suspense>

      {/* Decision list */}
      {records.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <span className="text-4xl">🏺</span>
          {allCount === 0 ? (
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
            <DecisionCard key={record.id} decision={record} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`?page=${page - 1}${q ? `&q=${q}` : ''}${domain ? `&domain=${domain}` : ''}`}
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
              href={`?page=${page + 1}${q ? `&q=${q}` : ''}${domain ? `&domain=${domain}` : ''}`}
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
