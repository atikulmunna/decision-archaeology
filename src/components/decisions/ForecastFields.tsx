'use client'

import { useId } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { fieldClasses } from '@/components/ui/Input'
import { forecastSentence } from '@/lib/forecasting'
import { FORECAST_MAX, ForecastSchema, type ForecastInput } from '@/lib/validations/decision'

/** A forecast while it is being written: the date may still be empty. */
export type ForecastDraft = { statement: string; probability: number; resolveBy: string }

const DEFAULT_PROBABILITY = 50
const HALF_FILLED = 'Add a statement and a date, or remove this forecast.'

const DAY_MS = 24 * 60 * 60 * 1000
const DATE_SHAPE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/

// Complete means both parts are there and the date is a plain day the server can read.
const isComplete = (draft: ForecastDraft) => draft.statement.trim().length > 0 && DATE_SHAPE.test(draft.resolveBy)
const isEmpty = (draft: ForecastDraft) => draft.statement.trim().length === 0 && draft.resolveBy.length === 0

/** The forecasts worth saving: both a statement and a date. */
export function completeForecasts(drafts: ForecastDraft[]): ForecastInput[] {
  return drafts.filter(isComplete).map(({ statement, probability, resolveBy }) => ({ statement, probability, resolveBy }))
}

/** Where each saved forecast sits on screen: the server's forecast index i is form index completeIndices(drafts)[i]. */
export function completeIndices(drafts: ForecastDraft[]): number[] {
  return drafts.flatMap((draft, index) => (isComplete(draft) ? [index] : []))
}

/**
 * A message for each forecast that would not seal, keyed by index: half-filled ones, and
 * complete ones the sealing rules refuse (a date that is not after today, for example).
 */
export function forecastErrors(drafts: ForecastDraft[]): Record<number, string> {
  const errors: Record<number, string> = {}
  drafts.forEach((draft, index) => {
    if (isEmpty(draft)) return
    if (draft.statement.trim().length === 0 || draft.resolveBy.length === 0) {
      errors[index] = HALF_FILLED
      return
    }
    const parsed = ForecastSchema.safeParse(draft)
    if (!parsed.success) errors[index] = parsed.error.issues[0].message
  })
  return errors
}

/** The first day a new forecast can resolve by: tomorrow in UTC, which the server also requires. */
function firstAllowedDay(): string {
  return new Date(Date.now() + DAY_MS).toISOString().slice(0, 10)
}

const label = 'text-sm font-medium text-ink-2'

function ForecastRow({
  index,
  draft,
  error,
  onChange,
  onRemove,
}: {
  index: number
  draft: ForecastDraft
  error?: string
  onChange: (next: ForecastDraft) => void
  onRemove: () => void
}) {
  const id = useId()
  const number = index + 1
  return (
    <fieldset className="flex flex-col gap-3 rounded-sm border border-rule bg-surface p-4">
      <legend className="px-1 font-mono text-[11px] uppercase tracking-[0.09em] text-muted">Forecast {number}</legend>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-statement`} className={label}>
          What will happen
        </label>
        <input
          id={`${id}-statement`}
          type="text"
          maxLength={200}
          value={draft.statement}
          placeholder="I am promoted to staff engineer"
          onChange={(event) => onChange({ ...draft, statement: event.target.value })}
          className={fieldClasses()}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3">
          <span className="w-16 font-display text-[30px] leading-none tabular-nums text-ink">{draft.probability}%</span>
          <input
            type="range"
            min={5}
            max={95}
            step={5}
            value={draft.probability}
            aria-label={`Probability for forecast ${number}`}
            onChange={(event) => onChange({ ...draft, probability: Number(event.target.value) })}
            className="flex-1 accent-ink"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor={`${id}-date`} className={label}>
            Resolve by
          </label>
          <input
            id={`${id}-date`}
            type="date"
            min={firstAllowedDay()}
            value={draft.resolveBy}
            onChange={(event) => onChange({ ...draft, resolveBy: event.target.value })}
            className={fieldClasses()}
          />
        </div>
      </div>

      {isComplete(draft) && (
        <p className="text-sm italic text-ink-2">
          {forecastSentence({
            statement: draft.statement.trim(),
            probability: draft.probability,
            resolveBy: new Date(`${draft.resolveBy}T00:00:00.000Z`),
          })}
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}

      <div>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </fieldset>
  )
}

/**
 * Up to three yes or no forecasts, each a statement, a probability in steps of 5
 * and a resolve-by date. They lock and are sealed with the decision.
 */
export function ForecastFields({
  forecasts,
  defaultResolveBy,
  errors,
  onChange,
}: {
  forecasts: ForecastDraft[]
  defaultResolveBy?: string
  errors: Record<number, string>
  onChange: (next: ForecastDraft[]) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className={label}>Forecasts</p>
        <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.09em] text-muted">Optional · up to 3</p>
      </div>
      {forecasts.map((draft, index) => (
        <ForecastRow
          key={index}
          index={index}
          draft={draft}
          error={errors[index]}
          onChange={(next) => onChange(forecasts.map((current, i) => (i === index ? next : current)))}
          onRemove={() => onChange(forecasts.filter((_, i) => i !== index))}
        />
      ))}
      {forecasts.length < FORECAST_MAX && (
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              onChange([...forecasts, { statement: '', probability: DEFAULT_PROBABILITY, resolveBy: defaultResolveBy ?? '' }])
            }
          >
            <Plus aria-hidden="true" size={14} strokeWidth={1.5} />
            Add a forecast
          </Button>
        </div>
      )}
    </div>
  )
}
