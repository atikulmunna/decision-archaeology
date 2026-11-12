import { ArchiveView } from '@/components/decisions/ArchiveView'
import { parseArchiveSearchParams, parseStrataParams, type ArchiveSearchParams } from '@/lib/archive-view'
import { DEMO_NOW } from '@/lib/demo/clock'
import { layoutStrata } from '@/lib/strata'
import { getDemoCalibrationRecords, listDemoDecisions, listDemoStrataRecords } from '@/lib/demo/queries'
import { DEMO_ARCHIVE_LINE } from '@/lib/demo/persona'
import { DEMO_ROUTES } from '@/lib/routes'

export const metadata = { title: 'Demo archive | Decision Archaeology' }

export default async function DemoArchivePage({ searchParams }: { searchParams: Promise<ArchiveSearchParams> }) {
  const raw = await searchParams
  const { filters, pageParams, hasFilters } = parseArchiveSearchParams(raw)
  const { view, year } = parseStrataParams(raw)
  const { records, total, page } = listDemoDecisions(filters)
  const strata = view === 'strata'
    ? { layout: layoutStrata(listDemoStrataRecords(filters).records, { year, now: DEMO_NOW }), cappedTotal: null }
    : undefined

  return (
    <ArchiveView
      mode="demo"
      routes={DEMO_ROUTES}
      records={records}
      total={total}
      allCount={getDemoCalibrationRecords().length}
      page={page}
      pageParams={pageParams}
      hasFilters={hasFilters}
      searchQuery={filters.q}
      intro={DEMO_ARCHIVE_LINE}
      view={view}
      strata={strata}
    />
  )
}
