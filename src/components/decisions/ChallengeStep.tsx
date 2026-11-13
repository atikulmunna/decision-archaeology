'use client'

import { useId, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
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

  async function request() {
    if (asking.current) return
    asking.current = true
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

      {asked ? (
        <>
          <ol className="flex flex-col gap-5">
            {challenge.questions.map((item, index) => {
              const value = challenge.answers[index] ?? ''
              return (
                <li key={item.position} className="flex flex-col gap-2">
                  <p className="break-words font-display text-[18px] leading-snug text-ink">
                    <span className="mr-2 font-mono text-[12px] text-muted">{index + 1}.</span>
                    {item.question}
                  </p>
                  <label htmlFor={`${id}-answer-${index}`} className="text-sm font-medium text-ink-2">
                    Your answer (optional)
                  </label>
                  <textarea
                    id={`${id}-answer-${index}`}
                    value={value}
                    maxLength={CHALLENGE_ANSWER_MAX}
                    rows={3}
                    onChange={(event) => answer(index, event.target.value)}
                    className={`${fieldClasses()} resize-y`}
                  />
                  <p className="self-end font-mono text-[11px] text-muted">
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
          {status.kind === 'asking' && (
            <p role="status" className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted">
              Reading your reasoning...
            </p>
          )}
          {(status.kind === 'failed' || status.kind === 'capped') && <Callout tone="warning">{status.message}</Callout>}
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
