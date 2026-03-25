'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { StepIndicator } from '@/components/ui/StepIndicator'
import { TimeCapsuleConfirmation } from './TimeCapsuleConfirmation'
import { CountdownTimer } from './CountdownTimer'
import { AttachmentManager } from './AttachmentManager'
import { StarterDecisionWizard } from './StarterDecisionWizard'
import type { CreateDecisionInput, DraftDecisionInput } from '@/lib/validations/decision'

const STEPS = ['Basics', 'Reasoning', 'Context', 'Confirm']
const MIN = 20
const DRAFT_STORAGE_KEY = 'decision-archaeology:draft-id'

type FormState = Partial<CreateDecisionInput>
type Step = 1 | 2 | 3 | 4 | 5 // 4 = confirm, 5 = saved+timer

const DOMAIN_OPTIONS = ['CAREER', 'FINANCE', 'HEALTH', 'RELATIONSHIPS', 'CREATIVE', 'OTHER'] as const

function fieldError(value: string | undefined, label: string) {
  if (!value) return `${label} is required`
  if (value.length < MIN) return `${label} must be at least ${MIN} characters (${value.length}/${MIN})`
  return undefined
}

export function DecisionCaptureForm({ initialDraftId }: { initialDraftId?: string }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormState>({ customTags: [] })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [savedRecord, setSavedRecord] = useState<{ id: string; createdAt: string } | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'restored'>('idle')
  const [activeDecisionId, setActiveDecisionId] = useState<string | undefined>(initialDraftId)
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null)
  const draftRef = useRef<string | null>(null)
  const hydratedRef = useRef(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
  }), [form])

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
  const saveDraft = useCallback(async () => {
    if (!hydratedRef.current || savedRecord || !hasDraftContent()) return

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
    } catch {
      setDraftStatus('error')
    }
  }, [buildDraftPayload, ensureDraftDecision, hasDraftContent, savedRecord])

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
    setStep((s) => (s + 1) as Step)
    setErrors({})
    void saveDraft()
  }

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
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
        const err = await res.json()
        console.error('Submit failed:', err)
        return
      }

      const record = await res.json()
      draftRef.current = record.id
      setActiveDecisionId(record.id)
      window.localStorage.removeItem(DRAFT_STORAGE_KEY)
      setSavedRecord({ id: record.id, createdAt: record.createdAt })
      setStep(5)
    } finally {
      setSubmitting(false)
    }
  }, [form])

  const addTag = () => {
    const tag = tagInput.trim()
    if (!tag || (form.customTags?.length ?? 0) >= 5 || form.customTags?.includes(tag)) return
    set('customTags', [...(form.customTags ?? []), tag])
    setTagInput('')
  }

  const removeTag = (tag: string) =>
    set('customTags', form.customTags?.filter((t) => t !== tag) ?? [])

  // ── Render ─────────────────────────────────────────────────

  if (step === 5 && savedRecord) {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-green-900">Decision recorded!</p>
              <p className="text-sm text-green-700">&quot;{form.title}&quot;</p>
            </div>
          </div>
        </div>

        {!isLocked ? (
          <CountdownTimer
            lockedAt={savedRecord.createdAt}
            decisionId={savedRecord.id}
            onLocked={() => setIsLocked(true)}
          />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            🔒 Core fields are now permanently locked.
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => router.push('/decisions')}>
            View all decisions
          </Button>
          <Button onClick={() => router.push(`/decisions/${savedRecord.id}`)}>
            Open this record →
          </Button>
        </div>
      </div>
    )
  }

  if (step === 4) {
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
    }
    return (
      <TimeCapsuleConfirmation
        data={complete}
        onConfirm={handleSubmit}
        onBack={() => setStep(3)}
        loading={submitting}
      />
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {(draftStatus === 'restored' || draftStatus === 'saving' || draftStatus === 'saved' || draftStatus === 'error') && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            draftStatus === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-indigo-100 bg-indigo-50 text-indigo-700'
          }`}
        >
          {draftStatus === 'restored' && 'Draft restored from your last session.'}
          {draftStatus === 'saving' && 'Saving draft…'}
          {draftStatus === 'saved' && 'Draft saved.'}
          {draftStatus === 'error' && 'Draft save failed. Your local edits are still in the form.'}
        </div>
      )}

      <StepIndicator steps={STEPS.slice(0, 3)} currentStep={step} />

      {/* Step 1 — Basics */}
      {step === 1 && (
        <div className="flex flex-col gap-5">
          {!initialDraftId && !hasDraftContent() && (
            <StarterDecisionWizard onChoose={applyStarterPrompt} />
          )}

          <h2 className="text-lg font-semibold text-gray-900">What is the decision?</h2>

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

      {/* Step 2 — Reasoning */}
      {step === 2 && (
        <div className="flex flex-col gap-5">
          <h2 className="text-lg font-semibold text-gray-900">What is your reasoning?</h2>

          <Textarea
            id="alternatives"
            label="Alternatives Considered"
            required
            placeholder='What other options did you consider? (If none, write "None considered — because...")'
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

      {/* Step 3 — Optional context */}
      {step === 3 && (
        <div className="flex flex-col gap-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Optional context <span className="text-sm font-normal text-gray-400">(skip if not applicable)</span>
          </h2>

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

          <AttachmentManager
            decisionId={activeDecisionId}
            onRequireDecisionId={ensureDraftDecision}
          />

          <div className="flex gap-4">
            <div className="flex flex-col gap-1 flex-1">
              <label htmlFor="confidence" className="text-sm font-medium text-gray-700">
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
                  className="flex-1 accent-indigo-600"
                />
                <span className="w-8 text-center text-sm font-semibold text-indigo-600">
                  {form.confidenceLevel ?? 5}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1 flex-1">
              <label htmlFor="domain" className="text-sm font-medium text-gray-700">Domain</label>
              <select
                id="domain"
                value={form.domainTag ?? ''}
                onChange={(e) => set('domainTag', e.target.value || null)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select domain...</option>
                {DOMAIN_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom tags */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Custom Tags (max 5)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add a tag..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Button variant="secondary" size="sm" onClick={addTag} disabled={(form.customTags?.length ?? 0) >= 5}>
                Add
              </Button>
            </div>
            {(form.customTags?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.customTags?.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-indigo-900">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between border-t border-gray-100 pt-4">
        {step > 1 ? (
          <Button variant="ghost" onClick={() => setStep((s) => (s - 1) as Step)}>
            ← Back
          </Button>
        ) : (
          <div />
        )}
        <Button onClick={nextStep}>
          {step === 3 ? 'Review & Lock →' : 'Next →'}
        </Button>
      </div>
    </div>
  )
}
