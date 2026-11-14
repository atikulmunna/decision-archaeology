'use client'

import { useEffect, useState } from 'react'
import { archiveViewHref } from '@/lib/archive-view'
import {
  LANES,
  LANE_WIDTH,
  SPECIMEN_SIZE,
  STRATA_GUTTER,
  STRATA_TOP,
  type LaneKey,
  type OutcomeStyle,
  type StrataLayout,
} from '@/lib/strata'

const mono = 'font-mono text-[11px] uppercase tracking-[0.09em]'
const settle = 'motion-safe:animate-[stratum-settle_400ms_ease-out_both]'

// Literal class names, so Tailwind generates each one.
const LANE_FILL: Record<LaneKey, string> = {
  CAREER: 'fill-stratum-career',
  FINANCE: 'fill-stratum-finance',
  HEALTH: 'fill-stratum-health',
  RELATIONSHIPS: 'fill-stratum-relationships',
  CREATIVE: 'fill-stratum-creative',
  OTHER: 'fill-stratum-other',
}

const DOT: Record<OutcomeStyle, string> = {
  better: 'fill-signal stroke-ink',
  expected: 'fill-ink stroke-ink',
  worse: 'fill-danger stroke-ink',
  early: 'fill-none stroke-ink',
}

const LEGEND: Array<{ style: OutcomeStyle; label: string }> = [
  { style: 'better', label: 'Better' },
  { style: 'expected', label: 'As expected' },
  { style: 'worse', label: 'Worse' },
  { style: 'early', label: 'Too early to tell' },
]

function YearChips({ layout, pageParams }: { layout: StrataLayout; pageParams: string }) {
  const chip = (selected: boolean) =>
    `rounded-sm border px-2.5 py-1 ${mono} ${selected ? 'border-ink bg-signal text-on-signal' : 'border-rule bg-surface text-ink-2 hover:text-ink'}`
  return (
    <nav aria-label="Year" className="flex flex-wrap gap-2">
      <a href={archiveViewHref(pageParams, 'strata')} aria-current={layout.year === null ? 'true' : undefined} className={chip(layout.year === null)}>
        All time
      </a>
      {layout.years.map((year) => (
        <a
          key={year}
          href={archiveViewHref(pageParams, 'strata', year)}
          aria-current={layout.year === year ? 'true' : undefined}
          className={chip(layout.year === year)}
        >
          {year}
        </a>
      ))}
    </nav>
  )
}

/**
 * The drawing half of the strata (client: the hover and focus card). It gets every
 * decision link resolved already, because functions cannot cross to the client.
 */
export function StrataCanvas({
  layout,
  hrefs,
  pageParams,
  cappedTotal,
}: {
  layout: StrataLayout
  /** Decision id to its link. */
  hrefs: Record<string, string>
  pageParams: string
  cappedTotal: number | null
}) {
  const [active, setActive] = useState<string | null>(null)
  const current = layout.specimens.find((specimen) => specimen.id === active) ?? null

  // A card shown on hover or focus closes on Escape wherever focus is (WCAG 1.4.13).
  useEffect(() => {
    if (!active) return
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActive(null)
    }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [active])
  const columnRight = layout.width
  const laneSeparators = LANES.slice(1).map((_, index) => STRATA_GUTTER + LANE_WIDTH * (index + 1))
  const empty = layout.specimens.length === 0 && layout.year !== null

  return (
    <section aria-label="Strata" className="flex flex-col gap-4">
      <YearChips layout={layout} pageParams={pageParams} />
      {cappedTotal !== null && <p className="text-sm text-ink-2">{`Showing the newest 500 of ${cappedTotal} decisions.`}</p>}

      <div className="relative w-full max-w-[560px]">
        <svg viewBox={`0 0 ${layout.width} ${layout.height}`} role="group" aria-label={layout.summary} className="h-auto w-full">
          {layout.bands.map((band, index) => (
            <g key={band.key}>
              <rect
                data-stratum-band
                x={STRATA_GUTTER}
                y={band.y}
                width={columnRight - STRATA_GUTTER}
                height={band.height}
                className={`${band.tone === 'a' ? 'fill-band-a' : 'fill-band-b'} ${settle}`}
                style={{ animationDelay: `${Math.round((index / Math.max(1, layout.bands.length)) * 150)}ms` }}
              />
              <text x={4} y={band.y + band.height / 2 + 3} fontSize={9} className="fill-muted font-mono">
                {band.label}
              </text>
            </g>
          ))}
          {laneSeparators.map((x) => (
            <line key={x} x1={x} y1={STRATA_TOP} x2={x} y2={layout.height} className="stroke-rule" strokeWidth={1} />
          ))}
          {LANES.map((lane) => (
            <g key={lane.key} className="fill-muted font-mono">
              <text x={lane.x} y={16} fontSize={7} textAnchor="middle" className="max-sm:hidden">
                {lane.label.toUpperCase()}
              </text>
              <text x={lane.x} y={16} fontSize={8} textAnchor="middle" aria-hidden="true" className="sm:hidden">
                {lane.short}
              </text>
            </g>
          ))}

          {layout.cores.map((core) => (
            <line
              key={core.decisionId}
              x1={core.x}
              y1={core.y1}
              x2={core.x}
              y2={core.y2}
              className="stroke-ink"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
          ))}
          {layout.outcomes.map((outcome, index) =>
            outcome.beyond ? (
              <polygon
                key={`${outcome.decisionId}-${index}`}
                points={`${outcome.x - 4},${outcome.y + 4} ${outcome.x + 4},${outcome.y + 4} ${outcome.x},${outcome.y - 3}`}
                className={DOT[outcome.style]}
                strokeWidth={1}
              >
                <title>{`Outcome in ${outcome.beyond}`}</title>
              </polygon>
            ) : (
              <circle
                key={`${outcome.decisionId}-${index}`}
                cx={outcome.x}
                cy={outcome.y}
                r={4}
                className={DOT[outcome.style]}
                strokeWidth={1}
              />
            )
          )}

          {layout.specimens.map((specimen, index) => (
            <a
              key={specimen.id}
              href={hrefs[specimen.id]}
              aria-label={specimen.name}
              className="group outline-none"
              onMouseEnter={() => setActive(specimen.id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(specimen.id)}
              onBlur={() => setActive(null)}
            >
              <rect x={specimen.x - 12} y={specimen.y - 12} width={24} height={24} className="fill-transparent" />
              <rect
                x={specimen.x - 9}
                y={specimen.y - 9}
                width={18}
                height={18}
                rx={5}
                strokeWidth={2}
                className="fill-none stroke-signal-ink opacity-0 group-focus-visible:opacity-100"
              />
              <rect
                data-specimen
                x={specimen.x - SPECIMEN_SIZE / 2}
                y={specimen.y - SPECIMEN_SIZE / 2}
                width={SPECIMEN_SIZE}
                height={SPECIMEN_SIZE}
                rx={3}
                strokeWidth={1}
                strokeDasharray={specimen.pending ? '3 2' : undefined}
                className={`${LANE_FILL[specimen.lane]} stroke-ink ${settle}`}
                style={{ animationDelay: `${150 + Math.round((index / Math.max(1, layout.specimens.length)) * 150)}ms` }}
              />
            </a>
          ))}
        </svg>

        {current && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-10 w-56 rounded-sm border border-ink bg-surface p-3 text-sm text-ink shadow-[0_2px_0_var(--ink)]"
            style={{
              left: `${(current.x / layout.width) * 100}%`,
              top: `${(current.y / layout.height) * 100}%`,
              transform: current.x > layout.width * 0.55 ? 'translate(calc(-100% - 12px), -50%)' : 'translate(12px, -50%)',
            }}
          >
            <p className={`${mono} text-ink`}>{`${current.card.catalog} · ${current.card.domain}`}</p>
            <p className="mt-1 leading-snug">{current.card.title}</p>
            <p className={`mt-2 ${mono} text-muted`}>{current.card.sealed}</p>
            <p className={`${mono} text-muted`}>{current.card.status}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
          {LEGEND.map((entry) => (
            <li key={entry.style} className="flex items-center gap-1.5">
              <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" aria-hidden="true">
                <circle cx={5} cy={5} r={4} strokeWidth={1} className={DOT[entry.style]} />
              </svg>
              {entry.label}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
              <rect x={1} y={1} width={10} height={10} rx={3} strokeWidth={1} strokeDasharray="3 2" className="fill-none stroke-ink" />
            </svg>
            Dashed: no outcome yet
          </li>
        </ul>
        <p className={`${mono} text-muted`}>
          {empty ? `Nothing sealed in ${layout.year} matches these filters.` : layout.summary}
        </p>
      </div>
    </section>
  )
}
