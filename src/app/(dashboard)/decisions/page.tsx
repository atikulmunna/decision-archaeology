import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getDecisions, getDraftDecisions } from '@/lib/decisions'
import { ArchiveView } from '@/components/decisions/ArchiveView'
import { parseArchiveSearchParams, type ArchiveSearchParams } from '@/lib/archive-view'
import { getOrCreateDbUser } from '@/lib/db-user'
import { logError } from '@/lib/observability'
import { APP_ROUTES } from '@/lib/routes'
import { createTimer } from '@/lib/timing'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Decisions | Decision Archaeology',
}

export default async function DecisionsPage({ searchParams }: { searchParams: Promise<ArchiveSearchParams> }) {
  const timer = createTimer('page.dashboard.decisions')
  const { userId } = await auth()
  if (!userId) return null

  const [dbUser, params] = await Promise.all([getOrCreateDbUser(userId), searchParams])
  if (!dbUser) return null

  const { filters, pageParams, hasFilters } = parseArchiveSearchParams(params)
  const page = filters.page ?? 1

  let records: Awaited<ReturnType<typeof getDecisions>>['records'] = []
  let total = 0
  let drafts: Awaited<ReturnType<typeof getDraftDecisions>> = []
  let allCount = 0
  let archiveError = false

  try {
    const result = await Promise.all([
      getDecisions(dbUser.id, filters),
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
      query: filters.q ?? null,
    })
  }

  timer.end({ total, draftCount: drafts.length, archiveError })

  return (
    <ArchiveView
      mode="owner"
      routes={APP_ROUTES}
      records={records}
      total={total}
      allCount={allCount}
      page={page}
      pageParams={pageParams}
      hasFilters={hasFilters}
      searchQuery={filters.q}
      drafts={drafts}
      archiveError={archiveError}
      canImport={dbUser.tier === 'POWER'}
    />
  )
}
