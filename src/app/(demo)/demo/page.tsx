import { ArchiveView } from '@/components/decisions/ArchiveView'
import { parseArchiveSearchParams, type ArchiveSearchParams } from '@/lib/archive-view'
import { getDemoCalibrationRecords, listDemoDecisions } from '@/lib/demo/queries'
import { DEMO_ARCHIVE_LINE } from '@/lib/demo/persona'
import { DEMO_ROUTES } from '@/lib/routes'

export const metadata = { title: 'Demo archive | Decision Archaeology' }

export default async function DemoArchivePage({ searchParams }: { searchParams: Promise<ArchiveSearchParams> }) {
  const { filters, pageParams, hasFilters } = parseArchiveSearchParams(await searchParams)
  const { records, total, page } = listDemoDecisions(filters)

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
    />
  )
}
