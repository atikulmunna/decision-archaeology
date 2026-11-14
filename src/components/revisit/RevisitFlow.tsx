'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { Forecast, OutcomeUpdate } from '@prisma/client'
import { Button } from '@/components/ui/Button'
import { fieldClasses } from '@/components/ui/Input'
import { AssumptionList } from '@/components/decisions/AssumptionList'
import { ForecastList } from '@/components/decisions/ForecastList'
import { AddOutcomeForm } from '@/components/decisions/AddOutcomeForm'
import { ChallengeRecord } from '@/components/decisions/ChallengeRecord'
import { LetterSection } from '@/components/decisions/LetterSection'
import { checkInChoices } from '@/lib/revisit'
import { addUtcDays, addUtcYears, isoDay, startOfUtcDay } from '@/lib/utc-days'
import { OUTCOME_LABELS } from '@/lib/outcomes'
import type { ReviewLike } from '@/lib/assumptions'
import type { LetterPeek } from '@/lib/revisit-summary'
import type { RevisitData } from './revisit-data'

const STEPS = ['Letter', 'Sealed', 'Assumptions', 'Forecasts', 'Outcome', 'Next'] as const
const label = 'font-mono text-[11px] uppercase tracking-[0.09em] text-muted'
const FAILED = 'Could not record the revisit. Try again.'

type Pick = '1 month' | '3 months' | '6 months' | 'day' | 'never'

/** The guided revisit: six skippable steps, then the next check-in. The demo shows it read-only. */
export function RevisitFlow({ mode, data, letter, now }: { mode: 'owner' | 'demo'; data: RevisitData; letter: LetterPeek; now: Date }) {
  const id = useId()
  const readOnly = mode === 'demo'
  const [step, setStep] = useState(0)
  const [reviews, setReviews] = useState<ReviewLike[]>(data.reviews)
  const [forecasts, setForecasts] = useState<Forecast[]>(data.forecasts)
  const [outcomes, setOutcomes] = useState<OutcomeUpdate[]>(data.outcomes)
  // The forecasts due when the revisit started stay listed after they are resolved here.
  const [dueIds] = useState(() => new Set(data.forecasts.filter((f) => f.resolution === null && new Date(f.resolveBy) < now).map((f) => f.id)))
  const choices = checkInChoices(now)
  // Start on the pending check-in only while it is still ahead; one already due would be refused.
  const today = startOfUtcDay(now)
  const pendingAhead = data.pendingCheckIn !== null && startOfUtcDay(new Date(data.pendingCheckIn)) > today
  const [pick, setPick] = useState<Pick>(pendingAhead ? 'day' : '3 months')
  const [day, setDay] = useState(pendingAhead ? isoDay(new Date(data.pendingCheckIn!)) : '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'failed'>('idle')
  const [failure, setFailure] = useState(FAILED)
  // Each step change moves focus to the new step, so keyboard and screen reader users land on it.
  const stepRef = useRef<HTMLElement>(null)
  const moved = useRef(false)
  useEffect(() => {
    if (!moved.current) {
      moved.current = true
      return
    }
    stepRef.current?.focus()
  }, [step])

  const last = step === STEPS.length - 1
  const nextCheckIn = pick === 'never' ? null : pick === 'day' ? day : (choices.find((choice) => choice.label === pick)?.day ?? null)
  const due = forecasts.filter((forecast) => dueIds.has(forecast.id))
  const latest = outcomes.at(-1)

  async function finish() {
    if (readOnly || status === 'saving' || (pick === 'day' && !day)) return
    setStatus('saving')
    try {
      const response = await fetch(`/api/decisions/${data.id}/revisits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nextCheckIn }),
      })
      if (response.ok) {
        setStatus('done')
        return
      }
      const body = (await response.json().catch(() => null)) as { error?: unknown } | null
      setFailure(response.status === 400 && typeof body?.error === 'string' ? body.error : FAILED)
      setStatus('failed')
    } catch {
      setFailure(FAILED)
      setStatus('failed')
    }
  }

  const radio = (value: Pick, text: string) => (
    <label className="flex items-center gap-2 text-sm text-ink">
      <input type="radio" name={`${id}-next`} checked={pick === value} onChange={() => setPick(value)} disabled={status === 'done'} />
      {text}
    </label>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p role="status" aria-live="polite" className={label}>
          {`Step ${step + 1} of ${STEPS.length}`}
        </p>
        <ol aria-label="Revisit steps" className="flex flex-wrap gap-1">
          {STEPS.map((name, index) => (
            <li
              key={name}
              aria-current={index === step ? 'step' : undefined}
              className={`rounded-sm border px-2 py-1 ${label} ${index === step ? 'border-ink text-ink' : 'border-rule'}`}
            >
              {name}
            </li>
          ))}
        </ol>
      </div>

      <section ref={stepRef} tabIndex={-1} aria-label={STEPS[step]} className="flex flex-col gap-4 rounded-sm border border-rule bg-surface p-4 focus:outline-none sm:p-6">
        {step === 0 &&
          (letter.state === 'none' ? (
            <p className="text-sm text-ink-2">No letter for this decision.</p>
          ) : (
            <LetterSection letter={letter} fingerprint={letter.state === 'open' ? letter.sha256 : null} revisitHref={data.backHref} />
          ))}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <dl className="flex flex-col gap-3">
              <div>
                <dt className={label}>Chosen option</dt>
                <dd className="mt-1 whitespace-pre-wrap break-words font-display text-[17px] leading-relaxed text-ink">{data.chosenOption}</dd>
              </div>
              <div>
                <dt className={label}>Reasoning</dt>
                <dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{data.reasoning}</dd>
              </div>
              {data.predictedOutcome && (
                <div>
                  <dt className={label}>Predicted outcome</dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{data.predictedOutcome}</dd>
                </div>
              )}
              {data.confidenceLevel !== null && (
                <div>
                  <dt className={label}>Confidence</dt>
                  <dd className="mt-1 text-sm text-ink">{`${data.confidenceLevel}/10`}</dd>
                </div>
              )}
            </dl>
            <ChallengeRecord outcome={data.challenge.outcome} model={data.challenge.model} questions={data.challenge.questions} />
          </div>
        )}

        {step === 2 &&
          (data.uncertainties?.trim() ? (
            <AssumptionList
              decisionId={data.id}
              uncertainties={data.uncertainties}
              reviews={reviews}
              canEdit={!readOnly}
              canReview={data.canReview}
              onReviewsChange={setReviews}
            />
          ) : (
            <p className="text-sm text-ink-2">No assumptions to review.</p>
          ))}

        {step === 3 &&
          (due.length === 0 ? (
            <p className="text-sm text-ink-2">Nothing due.</p>
          ) : (
            <ForecastList
              decisionId={data.id}
              forecasts={due}
              canEdit={!readOnly}
              canResolve={data.canReview}
              now={now}
              onForecastsChange={(changed) => setForecasts((current) => current.map((item) => changed.find((next) => next.id === item.id) ?? item))}
            />
          ))}

        {step === 4 && (
          <div className="flex flex-col gap-4">
            {latest ? (
              <p className="text-sm text-ink-2">{`Latest outcome: ${OUTCOME_LABELS[latest.outcomeRating]}. ${latest.whatHappened}`}</p>
            ) : (
              <p className="text-sm text-ink-2">Nothing recorded yet.</p>
            )}
            {!readOnly && <AddOutcomeForm decisionId={data.id} onAdded={(outcome) => setOutcomes((current) => [...current, outcome])} />}
          </div>
        )}

        {last && (
          <fieldset className="flex flex-col gap-3">
            <legend className={`mb-2 ${label}`}>When should we check in next?</legend>
            {choices.map((choice) => radio(choice.label, choice.label))}
            {radio('day', 'A chosen day')}
            <label htmlFor={`${id}-day`} className="sr-only">
              On a day
            </label>
            <input
              id={`${id}-day`}
              type="date"
              value={day}
              onChange={(event) => {
                setDay(event.target.value)
                setPick('day')
              }}
              min={isoDay(addUtcDays(today, 1))}
              max={isoDay(addUtcYears(today, 2))}
              disabled={status === 'done'}
              className={`${fieldClasses()} max-w-[200px]`}
            />
            {radio('never', 'Not again')}
          </fieldset>
        )}
      </section>

      {status === 'done' ? (
        <div className="flex flex-wrap items-center gap-3">
          <p role="status" className="text-sm text-ink">
            Revisit recorded.
          </p>
          <Button href={data.backHref} variant="secondary" size="sm">
            Back to the decision
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {status === 'failed' && (
            <p role="alert" className="text-sm text-danger">
              {failure}
            </p>
          )}
          {readOnly && last && <p className="text-sm text-muted">The demo is read-only.</p>}
          <div className="flex flex-wrap justify-between gap-3 border-t border-rule pt-4">
            <Button variant="ghost" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>
              Back
            </Button>
            {last ? (
              <Button onClick={() => void finish()} disabled={readOnly || status === 'saving' || (pick === 'day' && !day)} loading={status === 'saving'}>
                Finish revisit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep((current) => current + 1)}>
                  Skip
                </Button>
                <Button onClick={() => setStep((current) => current + 1)}>Next</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
