'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { parseTourStep, tourState, withoutTour } from '@/lib/tour'

const label = 'font-mono text-[11px] uppercase tracking-[0.09em]'
const control = `${label} inline-flex min-h-9 items-center rounded-sm border px-3`

/** The slim guided-tour bar. It shows only while the address carries a valid ?tour=N. */
export function TourBar() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const step = parseTourStep(searchParams.get('tour'))
  if (step === null) return null
  const { stop, total, backHref, nextHref, nextLabel } = tourState(step)

  return (
    <>
      {/* Keeps the end of the page clear of the fixed bar. */}
      <div aria-hidden="true" className="h-40 sm:h-28" />
      <section
        aria-label="Guided tour"
        className="fixed inset-x-0 bottom-0 z-40 border-t-[1.5px] border-ink bg-surface text-ink"
      >
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p aria-live="polite" className={`${label} text-muted`}>
              {`Tour · ${step} of ${total} · ${stop.label}`}
            </p>
            <p className="mt-1 text-sm leading-snug text-ink">{stop.caption}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {backHref && (
              <Link href={backHref} className={`${control} border-rule text-ink-2 hover:text-ink`}>
                Back
              </Link>
            )}
            <Link href={nextHref} className={`${control} border-ink bg-signal text-on-signal`}>
              {nextLabel}
            </Link>
            <Link
              href={withoutTour(pathname, searchParams.toString())}
              className={`${control} border-transparent text-ink-2 underline-offset-4 hover:underline`}
            >
              End tour
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
