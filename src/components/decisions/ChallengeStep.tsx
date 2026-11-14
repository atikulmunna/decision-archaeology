'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { fieldClasses } from '@/components/ui/Input'
import { CHALLENGE_ANSWER_MAX, type CaptureChallenge } from '@/lib/devils-advocate'

const INTRO =
  'Want a second opinion? The AI reads what you wrote and asks two or three hard questions. Your answers are sealed with the decision. Nothing is sent unless you ask.'
const FAILED = 'The AI could not be reached. Try again, or seal without questions.'

type Status = { kind: 'idle' } | { kind: 'asking' } | { kind: 'failed'; message: string } | { kind: 'capped'; message: string }

/**
 * "Before you seal": the owner may ask the Devil's Advocate for two or three questions, answer
 * any of them, or seal without questions. Nothing is sent until "Challenge my reasoning".
 */
export function ChallengeStep({
  challenge,
  onChange,
  ask,
  onBack,
  onSkip,
  onContinue,
}: {
  challenge: CaptureChallenge
  onChange: (next: CaptureChallenge) => void
  ask: () => Promise<Response>
  onBack: () => void
  onSkip: () => void
  onContinue: () => void
}) {
  const id = useId()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  // One request at a time: the ref stops a second press before React re-renders the disabled button.
  const asking = useRef(false)
  const asked = challenge.outcome === 'ASKED' && challenge.questions.length > 0
  // What the live region says once the questions arrive, and whether focus should move to them.
  const [ready, setReady] = useState<string | null>(null)
  const focusQuestions = useRef(false)
  const listRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    if (asked && focusQuestions.current) {
      focusQuestions.current = false
      listRef.current?.focus()
    }
  }, [asked])

  async function request() {
    if (asking.current) return
    asking.current = true
    setReady(null)
    setStatus({ kind: 'asking' })
    try {
      const response = await ask()
      const body = (await response.json().catch(() => null)) as {
        questions?: Array<{ position: number; question: string }>
        model?: string | null
        error?: unknown
      } | null
      const message = typeof body?.error === 'string' ? body.error : FAILED
      if (response.ok && Array.isArray(body?.questions)) {
        const questions = body.questions
        focusQuestions.current = true
        setReady(`${questions.length} questions are ready.`)
        onChange({ outcome: 'ASKED', model: body.model ?? null, questions, answers: questions.map((_, index) => challenge.answers[index] ?? '') })
        setStatus({ kind: 'idle' })
      } else if (response.status === 429) {
        setStatus({ kind: 'capped', message })
      } else {
        // The server records the failure, so the review and the seal say the AI could not be reached.
        if (response.status === 503) onChange({ ...challenge, outcome: 'UNAVAILABLE' })
        setStatus({ kind: 'failed', message })
      }
    } catch {
      setStatus({ kind: 'failed', message: FAILED })
    } finally {
      asking.current = false
    }
  }

  const answer = (index: number, value: string) =>
    onChange({ ...challenge, answers: challenge.questions.map((_, i) => (i === index ? value : (challenge.answers[i] ?? ''))) })

  // One live region, always mounted, so screen readers hear the wait, the result and any failure.
  const failed = status.kind === 'failed' || status.kind === 'capped'
  const live = status.kind === 'asking' ? 'Reading your reasoning...' : failed ? status.message : asked ? (ready ?? '') : ''
  const liveClass = failed
    ? 'rounded-sm border border-rule bg-sunken px-4 py-3 text-sm text-ink'
    : asked
      ? 'sr-only'
      : 'font-mono text-[11px] uppercase tracking-[0.09em] text-muted'

  const back = (
    <Button variant="ghost" onClick={onBack} disabled={status.kind === 'asking'}>
      <ArrowLeft aria-hidden="true" size={14} strokeWidth={1.5} />
      Back
    </Button>
  )

  return (
    <section className="flex flex-col gap-6" aria-labelledby={`${id}-heading`}>
      <div className="flex flex-col gap-2">
        <h2 id={`${id}-heading`} className="font-display text-[26px] leading-tight text-ink">
          Before you seal
        </h2>
        {!asked && <p className="text-sm leading-relaxed text-ink-2">{INTRO}</p>}
      </div>

      <p role="status" aria-live="polite" className={liveClass}>
        {live}
      </p>

      {asked ? (
        <>
          <ol ref={listRef} tabIndex={-1} aria-label="Questions" className="flex flex-col gap-5 focus:outline-none">
            {challenge.questions.map((item, index) => {
              const value = challenge.answers[index] ?? ''
              return (
                <li key={item.position} className="flex flex-col gap-2">
                  <p id={`${id}-q-${index}`} className="break-words font-display text-[18px] leading-snug text-ink">
                    <span className="mr-1 font-mono text-[12px] text-muted">{index + 1}.</span>{' '}
                    {item.question}
                  </p>
                  <label htmlFor={`${id}-answer-${index}`} className="text-sm font-medium text-ink-2">
                    Your answer (optional)
                  </label>
                  <textarea
                    id={`${id}-answer-${index}`}
                    value={value}
                    maxLength={CHALLENGE_ANSWER_MAX}
                    aria-describedby={`${id}-q-${index} ${id}-count-${index}`}
                    rows={3}
                    onChange={(event) => answer(index, event.target.value)}
                    className={`${fieldClasses()} resize-y`}
                  />
                  <p id={`${id}-count-${index}`} className="self-end font-mono text-[11px] text-muted">
                    {value.length}/{CHALLENGE_ANSWER_MAX}
                  </p>
                </li>
              )
            })}
          </ol>
          {challenge.model && (
            <p className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted">
              Asked by {challenge.model} via OpenRouter Auto Router
            </p>
          )}
          <div className="flex flex-wrap justify-between gap-3 border-t border-rule pt-4">
            {back}
            <Button onClick={onContinue}>
              Continue to review
              <ArrowRight aria-hidden="true" size={14} strokeWidth={1.5} />
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap justify-between gap-3 border-t border-rule pt-4">
            {back}
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={onSkip} disabled={status.kind === 'asking'}>
                Seal without questions
              </Button>
              {status.kind !== 'capped' && (
                <Button onClick={() => void request()} disabled={status.kind === 'asking'}>
                  {status.kind === 'failed' ? 'Try again' : 'Challenge my reasoning'}
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
