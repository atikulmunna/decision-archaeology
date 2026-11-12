import { StrataCanvas } from '@/components/decisions/StrataCanvas'
import type { AppRoutes } from '@/lib/routes'
import type { StrataLayout } from '@/lib/strata'

/**
 * The archive as a geological column: oldest band at the bottom, a lane per
 * domain, each decision a link, its outcomes deposited above it. This half runs
 * on the server and resolves every link, so only plain data reaches the client.
 */
export function StrataColumn({
  layout,
  routes,
  pageParams,
  cappedTotal,
}: {
  layout: StrataLayout
  routes: AppRoutes
  pageParams: string
  cappedTotal: number | null
}) {
  const hrefs = Object.fromEntries(layout.specimens.map((specimen) => [specimen.id, routes.decision(specimen.id)]))
  return <StrataCanvas layout={layout} hrefs={hrefs} pageParams={pageParams} cappedTotal={cappedTotal} />
}
