/**
 * The guided tour: five demo stops carried in the link as ?tour=N, so Back and sharing just work and nothing is
 * stored. Pure, and free of demo data imports, because the client tour bar reads it.
 */

export type TourStop = { n: number; href: string; label: string; caption: string }

// demo-0007 is Rowan's Northwind decision (pinned by tour.test.ts).
const DECISION = '/demo/decisions/demo-0007'

export const TOUR_STOPS: readonly TourStop[] = [
  { n: 1, href: '/demo?tour=1', label: 'The archive', caption: "This is Rowan's archive: eighteen months of sealed decisions." },
  {
    n: 2,
    href: `${DECISION}?view=then&tour=2`,
    label: 'The seal',
    caption: 'Every decision is sealed. Press Verify seal, then try changing a word.',
  },
  { n: 3, href: `${DECISION}?view=now&tour=3`, label: 'Then vs Now', caption: 'Then vs Now: what Rowan expected, beside what happened.' },
  { n: 4, href: '/demo?view=strata&tour=4', label: 'The strata', caption: 'The archive as strata: newer decisions settle on top.' },
  { n: 5, href: '/demo/calibration?tour=5', label: 'Calibration', caption: 'Forecasts scored with a Brier score.' },
]

export const TOUR_START_HREF = TOUR_STOPS[0].href
export const TOUR_FINISH_HREF = '/how-it-works'

/** The stop number in ?tour=, or null for anything but a plain 1 to 5. */
export function parseTourStep(value: string | null): number | null {
  return value !== null && /^[1-5]$/.test(value) ? Number(value) : null
}

export function tourState(step: number): {
  stop: TourStop
  total: 5
  backHref: string | null
  nextHref: string
  nextLabel: 'Next' | 'Finish'
} {
  const last = step === TOUR_STOPS.length
  return {
    stop: TOUR_STOPS[step - 1],
    total: 5,
    backHref: step > 1 ? TOUR_STOPS[step - 2].href : null,
    nextHref: last ? TOUR_FINISH_HREF : TOUR_STOPS[step].href,
    nextLabel: last ? 'Finish' : 'Next',
  }
}

/** The current address without the tour, which is how the tour ends. */
export function withoutTour(pathname: string, search: string): string {
  const params = new URLSearchParams(search)
  params.delete('tour')
  const rest = params.toString()
  return rest ? `${pathname}?${rest}` : pathname
}
