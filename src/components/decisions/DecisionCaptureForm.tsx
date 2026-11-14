'use client'

import { startTransition, useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Callout } from '@/components/ui/Callout'
import { Input, fieldClasses } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { StepIndicator } from '@/components/ui/StepIndicator'
import { TimeCapsuleConfirmation } from './TimeCapsuleConfirmation'
import { ChallengeStep } from './ChallengeStep'
import { CountdownTimer } from './CountdownTimer'
import { SealedNotice } from './SealedNotice'
import { AttachmentManager } from './AttachmentManager'
import { StarterDecisionWizard } from './StarterDecisionWizard'
import { ForecastFields, completeForecasts, completeIndices, forecastErrors } from './ForecastFields'
import { toForecastInputs } from '@/lib/forecast-input'
import { EMPTY_CHALLENGE, type CaptureChallenge } from '@/lib/devils-advocate'
import type { CreateDecisionInput, DraftDecisionInput } from '@/lib/validations/decision'

const STEPS = ['Basics', 'Reasoning', 'Context', 'Challenge']
const MIN = 20
const DRAFT_STORAGE_KEY = 'decision-archaeology:draft-id'

type FormState = Partial<CreateDecisionInput>
type Step = 1 | 2 | 3 | 4 | 5 | 6 // 4 = challenge, 5 = confirm, 6 = saved+timer

const DOMAIN_OPTIONS = ['CAREER', 'FINANCE', 'HEALTH', 'RELATIONSHIPS', 'CREATIVE', 'OTHER'] as const

function fieldError(value: string | undefined, label: string) {
  if (!value) return `${label} is required`
  if (value.length < MIN) return `${label} must be at least ${MIN} characters (${value.length}/${MIN})`
  return undefined
}

export function DecisionCaptureForm({
  initialDraftId,
  upcomingCatalogNumber,
}: {
  initialDraftId?: string
  upcomingCatalogNumber: number
}) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormState>({ customTags: [] })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [savedRecord, setSavedRecord] = useState<{
    id: string
    createdAt: string
    catalogNumber: number | null
    sealHash: string | null
  } | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'restored'>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [forecastErrs, setForecastErrs] = useState<Record<number, string>>({})
  const [activeDecisionId, setActiveDecisionId] = useState<string | undefined>(initialDraftId)
  const [challenge, setChallenge] = useState<CaptureChallenge>(EMPTY_CHALLENGE)
  const [challengeSkipped, setChallengeSkipped] = useState(false)
  const [challengeError, setChallengeError] = useState<string | null>(null)
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null)
  const draftRef = useRef<string | null>(null)
  const hydratedRef = useRef(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    router.prefetch('/decisions')
  }, [router])

  const set = (field: keyof FormState, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const applyStarterPrompt = useCallback((seed: Partial<CreateDecisionInput>) => {
    setForm((prev) => ({
      ...prev,
      ...seed,
      customTags: prev.customTags?.length ? prev.customTags : (seed.customTags ?? []),
    }))
    setDraftStatus('idle')
    setErrors({})
  }, [])

  const hasDraftContent = useCallback(() => {
    return Object.values(form).some((value) => {
      if (typeof value === 'string') return value.trim().length > 0
      if (Array.isArray(value)) return value.length > 0
      return value !== undefined && value !== null
    })
  }, [form])

  const buildDraftPayload = useCallback((): DraftDecisionInput => ({
    title: form.title,
    summary: form.summary,
    context: form.context,
    alternatives: form.alternatives,
    chosenOption: form.chosenOption,
    reasoning: form.reasoning,
    values: form.values,
    uncertainties: form.uncertainties,
    predictedOutcome: form.predictedOutcome,
    predictedTimeframe: form.predictedTimeframe,
    confidenceLevel: form.confidenceLevel,
    domainTag: form.domainTag,
    customTags: form.customTags ?? [],
    // A half-filled forecast stays in the form but is not saved until it is complete.
    forecasts: completeForecasts(form.forecasts ?? []),
    ...(challenge.outcome === 'ASKED' ? { challengeAnswers: challenge.answers } : {}),
  }), [form, challenge])

  const ensureDraftDecision = useCallback(async (): Promise<string | null> => {
    if (draftRef.current) return draftRef.current

    const res = await fetch('/api/decisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...buildDraftPayload(), saveAsDraft: true }),
    })

    if (!res.ok) {
      setDraftStatus('error')
      return null
    }

    const draft = await res.json()
    draftRef.current = draft.id
    setActiveDecisionId(draft.id)
    window.localStorage.setItem(DRAFT_STORAGE_KEY, draft.id)
    return draft.id
  }, [buildDraftPayload])

  // Auto-save draft every 30s after step 1 is complete
  // Resolves false when the save failed, so a caller that depends on the stored draft can stop.
  const saveDraft = useCallback(async (): Promise<boolean> => {
    if (!hydratedRef.current || savedRecord || !hasDraftContent()) return true

    setDraftStatus('saving')

    try {
      if (draftRef.current) {
        const res = await fetch(`/api/decisions/${draftRef.current}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildDraftPayload()),
        })

        if (!res.ok) throw new Error('Draft update failed')
      }
      else {
        const draftId = await ensureDraftDecision()
        if (!draftId) throw new Error('Draft create failed')
      }

      setDraftStatus('saved')
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => setDraftStatus('idle'), 2000)
      return true
    } catch {
      setDraftStatus('error')
      return false
    }
  }, [buildDraftPayload, ensureDraftDecision, hasDraftContent, savedRecord])

  const askChallenge = useCallback(async (): Promise<Response> => {
    // The route reads the stored draft, so it must hold what is on screen before the AI reads it.
    const saved = await saveDraft()
    const id = draftRef.current
    if (!saved || !id) {
      return new Response(JSON.stringify({ error: 'We could not save your draft. Try again.' }), { status: 500 })
    }
    // A stalled server must not leave the step stuck: after 30 seconds the step offers Try again and the skip.
    return fetch(`/api/decisions/${id}/challenge`, { method: 'POST', signal: AbortSignal.timeout(30_000) })
  }, [saveDraft])

  useEffect(() => {
    hydratedRef.current = true
    autoSaveRef.current = setInterval(saveDraft, 30000)
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current)
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [saveDraft])

  useEffect(() => {
    const draftId = initialDraftId ?? window.localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!draftId) return

    let cancelled = false

    async function loadDraft() {
      try {
        const res = await fetch(`/api/decisions/${draftId}`)
        if (!res.ok) {
          window.localStorage.removeItem(DRAFT_STORAGE_KEY)
          return
        }

        const draft = await res.json()
        if (cancelled || !draft.isDraft) {
          window.localStorage.removeItem(DRAFT_STORAGE_KEY)
          return
        }

        draftRef.current = draft.id
        setActiveDecisionId(draft.id)
        window.localStorage.setItem(DRAFT_STORAGE_KEY, draft.id)
        setForm({
          title: draft.title || undefined,
          summary: draft.summary || undefined,
          context: draft.context || undefined,
          alternatives: draft.alternatives || undefined,
          chosenOption: draft.chosenOption || undefined,
          reasoning: draft.reasoning || undefined,
          values: draft.values || undefined,
          uncertainties: draft.uncertainties || undefined,
          predictedOutcome: draft.predictedOutcome || undefined,
          predictedTimeframe: draft.predictedTimeframe || undefined,
          confidenceLevel: draft.confidenceLevel ?? undefined,
          domainTag: draft.domainTag ?? undefined,
          customTags: draft.customTags ?? [],
          forecasts: draft.forecasts ? toForecastInputs(draft.forecasts) : undefined,
        })
        const rows = (Array.isArray(draft.challengeQuestions) ? [...draft.challengeQuestions] : []) as Array<{
          position: number
          question: string
          answer: string | null
        }>
        rows.sort((a, b) => a.position - b.position)
        setChallenge({
          outcome: draft.challengeOutcome ?? null,
          model: draft.challengeModel ?? null,
          questions: rows.map((row) => ({ position: row.position, question: row.question })),
          answers: rows.map((row) => row.answer ?? ''),
        })
        setDraftStatus('restored')
      } catch {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY)
      }
    }

    loadDraft()

    return () => {
      cancelled = true
    }
  }, [initialDraftId])

  // Step validators
  function validateStep1() {
    const e: Record<string, string> = {}
    const t = fieldError(form.title, 'Title')
    const s = fieldError(form.summary, 'Summary')
    const c = fieldError(form.context, 'Context')
    if (t) e.title = t
    if (s) e.summary = s
    if (c) e.context = c
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validateStep2() {
    const e: Record<string, string> = {}
    const a = fieldError(form.alternatives, 'Alternatives')
    const ch = fieldError(form.chosenOption, 'Chosen option')
    const r = fieldError(form.reasoning, 'Reasoning')
    if (a) e.alternatives = a
    if (ch) e.chosenOption = ch
    if (r) e.reasoning = r
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function nextStep() {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    if (step === 3) {
      const errs = forecastErrors(form.forecasts ?? [])
      setForecastErrs(errs)
      if (Object.keys(errs).length > 0) return
    }
    setStep((s) => (s + 1) as Step)
    setErrors({})
    setSubmitError(null)
    void saveDraft()
  }

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const payload: CreateDecisionInput = {
        title: form.title!,
        summary: form.summary!,
        context: form.context!,
        alternatives: form.alternatives!,
        chosenOption: form.chosenOption!,
        reasoning: form.reasoning!,
        values: form.values,
        uncertainties: form.uncertainties,
        predictedOutcome: form.predictedOutcome,
        predictedTimeframe: form.predictedTimeframe,
        confidenceLevel: form.confidenceLevel,
        domainTag: form.domainTag,
        customTags: form.customTags ?? [],
        forecasts: completeForecasts(form.forecasts ?? []),
        ...(challenge.outcome === 'ASKED'
          ? { challengeAnswers: challenge.answers }
          : challengeSkipped
            ? { challengeSkipped: true as const }
            : {}),
      }

      const res = draftRef.current
        ? await fetch(`/api/decisions/${draftRef.current}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, finalize: true }),
          })
        : await fetch('/api/decisions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        // A forecast the server refused goes back to its own field on step 3.
        const positions = completeIndices(form.forecasts ?? [])
        const forecastIssues: Record<number, string> = {}
        for (const issue of (err.issues ?? []) as Array<{ path?: Array<string | number>; message?: string }>) {
          const [field, index] = issue.path ?? []
          if (field === 'forecasts' && typeof index === 'number' && positions[index] !== undefined && issue.message) {
            forecastIssues[positions[index]] ??= issue.message
          }
        }
        if (Object.keys(forecastIssues).length > 0) {
          setForecastErrs(forecastIssues)
          setStep(3)
          return
        }
        // An answer the server refused goes back to the challenge step with its message.
        const challengeIssue = ((err.issues ?? []) as Array<{ path?: Array<string | number>; message?: string }>).find((issue) => issue.path?.[0] === 'challengeAnswers')
        if (challengeIssue || err.error === 'Answer each question, or leave it blank.' || err.error === 'There are no questions to answer.') {
          setChallengeError(challengeIssue?.message ?? err.error)
          setStep(4)
          return
        }
        console.error('Submit failed:', err)
        setSubmitError(err.error ?? 'We could not save this decision. Please try again.')
        return
      }

      const record = await res.json()
      draftRef.current = record.id
      setActiveDecisionId(record.id)
      window.localStorage.removeItem(DRAFT_STORAGE_KEY)
      setSavedRecord({
        id: record.id,
        createdAt: record.createdAt,
        catalogNumber: record.catalogNumber ?? null,
        sealHash: record.sealHash ?? null,
      })
      setStep(6)
      router.prefetch(`/decisions/${record.id}`)
    } catch (error) {
      console.error('Submit failed:', error)
      setSubmitError('A network or server error interrupted the save. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [form, router, challenge, challengeSkipped])

  const addTag = () => {
    const tag = tagInput.trim()
    if (!tag || (form.customTags?.length ?? 0) >= 5 || form.customTags?.includes(tag)) return
    set('customTags', [...(form.customTags ?? []), tag])
    setTagInput('')
  }

  const removeTag = (tag: string) =>
    set('customTags', form.customTags?.filter((t) => t !== tag) ?? [])

  // ── Render ─────────────────────────────────────────────────

  if (step === 6 && savedRecord) {
    return (
      <div className="flex flex-col gap-6">
        <Callout tone="success" title="Decision recorded">
          <span className="break-words font-display text-lg">{form.title}</span>
        </Callout>

        {!isLocked ? (
          <CountdownTimer
            lockedAt={savedRecord.createdAt}
            decisionId={savedRecord.id}
            onLocked={() => setIsLocked(true)}
          />
        ) : (
          <SealedNotice hash={savedRecord.sealHash} catalogNumber={savedRecord.catalogNumber} />
        )}

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => startTransition(() => router.push('/decisions'))}>
            View the archive
          </Button>
          <Button onClick={() => startTransition(() => router.push(`/decisions/${savedRecord.id}`))}>
            Open this record
            <ArrowRight aria-hidden="true" size={14} strokeWidth={1.5} />
          </Button>
        </div>
      </div>
    )
  }

  if (step === 5) {
    const complete: CreateDecisionInput = {
      title: form.title!,
      summary: form.summary!,
      context: form.context!,
      alternatives: form.alternatives!,
      chosenOption: form.chosenOption!,
      reasoning: form.reasoning!,
      values: form.values,
      uncertainties: form.uncertainties,
      predictedOutcome: form.predictedOutcome,
      confidenceLevel: form.confidenceLevel,
      domainTag: form.domainTag,
      customTags: form.customTags ?? [],
      forecasts: completeForecasts(form.forecasts ?? []),
    }
    return (
      <div className="flex flex-col gap-4">
        {submitError && (
          <Callout tone="danger" title="Could not seal this decision">
            {submitError}
          </Callout>
        )}
        <TimeCapsuleConfirmation
          data={complete}
          onConfirm={handleSubmit}
          onBack={() => setStep(4)}
          loading={submitting}
          upcomingCatalogNumber={upcomingCatalogNumber}
          challenge={{ ...challenge, skipped: challengeSkipped }}
        />
      </div>
    )
  }

  const promptClass = 'font-display text-[26px] leading-tight text-ink'

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <StepIndicator steps={STEPS} currentStep={step} />
        {draftStatus === 'error' ? (
          <Callout tone="danger">Draft save failed. Your edits are still in the form.</Callout>
        ) : (
          (draftStatus === 'restored' || draftStatus === 'saving' || draftStatus === 'saved') && (
            <p role="status" className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted">
              {draftStatus === 'restored' && 'Draft restored from your last session'}
              {draftStatus === 'saving' && 'Saving draft...'}
              {draftStatus === 'saved' && 'Draft saved'}
            </p>
          )
        )}
      </div>

      {/* Step 1: Basics */}
      {step === 1 && (
        <div className="flex flex-col gap-5">
          {!initialDraftId && !hasDraftContent() && (
            <StarterDecisionWizard onChoose={applyStarterPrompt} />
          )}

          <h2 className={promptClass}>What is the decision?</h2>

          <Input
            id="title"
            label="Decision Title"
            required
            placeholder="e.g. Accepting the senior role at Acme Corp"
            value={form.title ?? ''}
            onChange={(e) => set('title', e.target.value)}
            error={errors.title}
          />

          <Textarea
            id="summary"
            label="Decision Summary"
            required
            placeholder="A concise description of the decision you are making..."
            value={form.summary ?? ''}
            onChange={(e) => set('summary', e.target.value)}
            error={errors.summary}
            charCount={form.summary?.length ?? 0}
            minChars={MIN}
          />

          <Textarea
            id="context"
            label="Context"
            required
            placeholder="What is the situation? What information do you have right now that is relevant?"
            value={form.context ?? ''}
            onChange={(e) => set('context', e.target.value)}
            error={errors.context}
            charCount={form.context?.length ?? 0}
            minChars={MIN}
          />
        </div>
      )}

      {/* Step 2: Reasoning */}
      {step === 2 && (
        <div className="flex flex-col gap-5">
          <h2 className={promptClass}>What is your reasoning?</h2>

          <Textarea
            id="alternatives"
            label="Alternatives Considered"
            required
            placeholder='What other options did you consider? (If none, write "None considered, because...")'
            value={form.alternatives ?? ''}
            onChange={(e) => set('alternatives', e.target.value)}
            error={errors.alternatives}
            charCount={form.alternatives?.length ?? 0}
            minChars={MIN}
          />

          <Textarea
            id="chosenOption"
            label="Chosen Option"
            required
            placeholder="Describe exactly what you have decided to do..."
            value={form.chosenOption ?? ''}
            onChange={(e) => set('chosenOption', e.target.value)}
            error={errors.chosenOption}
            charCount={form.chosenOption?.length ?? 0}
            minChars={MIN}
          />

          <Textarea
            id="reasoning"
            label="Reasoning"
            required
            placeholder="Why this option? What made it better than the alternatives?"
            value={form.reasoning ?? ''}
            onChange={(e) => set('reasoning', e.target.value)}
            error={errors.reasoning}
            charCount={form.reasoning?.length ?? 0}
            minChars={MIN}
          />
        </div>
      )}

      {/* Step 3: Optional context */}
      {step === 3 && (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className={promptClass}>What else should future you know?</h2>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.09em] text-muted">
              Optional · skip what does not apply
            </p>
          </div>

          <Textarea
            id="values"
            label="Values at play"
            placeholder="What values, priorities, or beliefs are driving this decision?"
            value={form.values ?? ''}
            onChange={(e) => set('values', e.target.value)}
          />

          <Textarea
            id="uncertainties"
            label="Key uncertainties"
            placeholder="What do you not know? What could change your decision if it were different?"
            value={form.uncertainties ?? ''}
            onChange={(e) => set('uncertainties', e.target.value)}
          />

          <Textarea
            id="predictedOutcome"
            label="Predicted outcome"
            placeholder="What do you expect to happen as a result of this decision?"
            value={form.predictedOutcome ?? ''}
            onChange={(e) => set('predictedOutcome', e.target.value)}
          />

          <ForecastFields
            forecasts={form.forecasts ?? []}
            defaultResolveBy={form.predictedTimeframe?.slice(0, 10)}
            errors={forecastErrs}
            onChange={(next) => {
              set('forecasts', next)
              setForecastErrs({})
            }}
          />

          <AttachmentManager decisionId={activeDecisionId} onRequireDecisionId={ensureDraftDecision} />

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="confidence" className="text-sm font-medium text-ink-2">
                Confidence Level
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="confidence"
                  type="range"
                  min={1}
                  max={10}
                  value={form.confidenceLevel ?? 5}
                  onChange={(e) => set('confidenceLevel', parseInt(e.target.value))}
                  className="flex-1 accent-ink"
                />
                <span className="w-12 text-right font-mono text-sm tabular-nums text-ink">
                  {form.confidenceLevel ?? 5}/10
                </span>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="domain" className="text-sm font-medium text-ink-2">
                Domain
              </label>
              <select
                id="domain"
                value={form.domainTag ?? ''}
                onChange={(e) => set('domainTag', e.target.value || null)}
                className={fieldClasses()}
              >
                <option value="">Select domain...</option>
                {DOMAIN_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d.charAt(0) + d.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom tags */}
          <div className="flex flex-col gap-2">
            <label htmlFor="tag-input" className="text-sm font-medium text-ink-2">
              Custom Tags (max 5)
            </label>
            <div className="flex gap-2">
              <input
                id="tag-input"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add a tag..."
                className={`${fieldClasses()} flex-1`}
              />
              <Button variant="secondary" size="sm" onClick={addTag} disabled={(form.customTags?.length ?? 0) >= 5}>
                Add
              </Button>
            </div>
            {(form.customTags?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.customTags?.map((tag) => (
                  <Badge key={tag}>
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove tag ${tag}`}
                      className="ml-0.5 text-muted hover:text-ink"
                    >
                      <X aria-hidden="true" size={12} strokeWidth={1.5} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: the Devil's Advocate, asked only when the owner presses for it */}
      {step === 4 && (
        <div className="flex flex-col gap-4">
          {challengeError && (
            <Callout tone="danger" title="Could not seal this decision">
              {challengeError}
            </Callout>
          )}
          <ChallengeStep
            challenge={challenge}
            onChange={setChallenge}
            ask={askChallenge}
            onBack={() => setStep(3)}
            onSkip={() => {
              setChallengeSkipped(true)
              setChallengeError(null)
              setStep(5)
            }}
            onContinue={() => {
              setChallengeError(null)
              setStep(5)
              void saveDraft()
            }}
          />
        </div>
      )}

      {/* Navigation */}
      {step !== 4 && (
        <div className="flex justify-between border-t border-rule pt-4">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep((s) => (s - 1) as Step)}>
              <ArrowLeft aria-hidden="true" size={14} strokeWidth={1.5} />
              Back
            </Button>
          ) : (
            <div />
          )}
          <Button onClick={nextStep}>
            Next
            <ArrowRight aria-hidden="true" size={14} strokeWidth={1.5} />
          </Button>
        </div>
      )}
    </div>
  )
}
