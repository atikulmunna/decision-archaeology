'use client'

import { useState } from 'react'
import type { Forecast } from '@prisma/client'
import { Button } from '@/components/ui/Button'
import {
  brierTerm,
  forecastSentence,
  formatForecastDate,
  isDue,
  isPastResolveBy,
  RESOLUTION_LABELS,
  type ForecastResolution,
} from '@/lib/forecasting'

const label = 'font-mono text-[11px] uppercase tracking-[0.09em]'
const chipBase =
  'inline-flex max-w-full items-center rounded-sm px-1.5 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.06em]'

type Status = ForecastResolution | 'DUE' | 'OPEN'

const CHIP_TONES: Record<Status, string> = {
  HAPPENED: 'bg-signal text-on-signal',
  DIDNT: 'bg-signal text-on-signal',
  VOID: 'border border-rule text-muted',
  DUE: 'border border-ink bg-highlight text-ink',
  OPEN: 'border border-rule text-muted',
}
const STATUS_LABELS: Record<Status, string> = { ...RESOLUTION_LABELS, DUE: 'Due', OPEN: 'Open' }

function statusOf(forecast: Forecast, now: Date): Status {
  if (forecast.resolution) return forecast.resolution
  return isDue(forecast, now) ? 'DUE' : 'OPEN'
}

type ItemProps = {
  decisionId: string
  forecast: Forecast
  forecasts: Forecast[]
  canAct: boolean
  now: Date
  onForecastsChange?: (next: Forecast[]) => void
}

function ForecastItem({ decisionId, forecast, forecasts, canAct, now, onForecastsChange }: ItemProps) {
  const [changing, setChanging] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const status = statusOf(forecast, now)
  // Happened can be marked any time; the other two wait until the resolve-by day has passed.
  const options: ForecastResolution[] = isPastResolveBy(forecast.resolveBy, now) ? ['HAPPENED', 'DIDNT', 'VOID'] : ['HAPPENED']

  async function resolve(resolution: ForecastResolution | null) {
    const previous = forecasts
    setChanging(false)
    setError(null)
    setSaving(true)
    const next = { ...forecast, resolution, resolvedAt: resolution === null ? null : new Date() }
    onForecastsChange?.(forecasts.map((candidate) => (candidate.id === forecast.id ? next : candidate)))
    try {
      const response = await fetch(`/api/decisions/${decisionId}/forecasts/${forecast.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
    } catch {
      onForecastsChange?.(previous)
      setError('Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const scored = forecast.resolution === 'HAPPENED' || forecast.resolution === 'DIDNT'
  const showOptions = canAct && (forecast.resolution === null || changing)

  return (
    <li className="flex flex-col gap-2 border-b border-rule py-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 break-words text-sm leading-relaxed text-ink">
          {forecastSentence(forecast)}
        </p>
        <span data-chip className={`${chipBase} ${CHIP_TONES[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      {forecast.resolution && forecast.resolvedAt && (
        <p className={`${label} text-muted`}>
          {`Resolved ${formatForecastDate(forecast.resolvedAt)}`}
          {scored && ` · scored ${brierTerm(forecast.probability, forecast.resolution as 'HAPPENED' | 'DIDNT').toFixed(2)}`}
        </p>
      )}

      {canAct && (
        <div className="flex flex-wrap gap-2">
          {showOptions &&
            options.map((option) => (
              <Button key={option} type="button" size="sm" variant="secondary" disabled={saving} onClick={() => void resolve(option)}>
                {RESOLUTION_LABELS[option]}
              </Button>
            ))}
          {showOptions && forecast.resolution && (
            <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => void resolve(null)}>
              Reopen
            </Button>
          )}
          {!showOptions && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setChanging(true)}>
              Change
            </Button>
          )}
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </li>
  )
}

/**
 * The decision's sealed forecasts with how each resolved. Owners resolve them
 * once the decision is sealed, following the resolve-by date; everyone else reads.
 */
export function ForecastList({
  decisionId,
  forecasts,
  canEdit,
  canResolve,
  now,
  onForecastsChange,
}: {
  decisionId: string
  forecasts: Forecast[]
  canEdit: boolean
  canResolve: boolean
  now: Date
  onForecastsChange?: (next: Forecast[]) => void
}) {
  if (forecasts.length === 0) return null
  const ordered = [...forecasts].sort((a, b) => a.position - b.position)

  return (
    <section aria-label="Forecasts" className="flex flex-col gap-2">
      <h2 className={`${label} text-muted`}>Forecasts</h2>
      <ul className="flex flex-col rounded-sm border border-rule bg-surface px-4">
        {ordered.map((forecast) => (
          <ForecastItem
            key={forecast.id}
            decisionId={decisionId}
            forecast={forecast}
            forecasts={forecasts}
            canAct={canEdit && canResolve}
            now={now}
            onForecastsChange={onForecastsChange}
          />
        ))}
      </ul>
      {canEdit && !canResolve && <p className="text-sm text-muted">Resolve forecasts once the decision is sealed.</p>}
    </section>
  )
}
