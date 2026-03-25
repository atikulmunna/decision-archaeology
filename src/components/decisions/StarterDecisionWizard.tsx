'use client'

import type { CreateDecisionInput } from '@/lib/validations/decision'
import { STARTER_DECISION_PROMPTS } from '@/lib/onboarding'
import { Button } from '@/components/ui/Button'

type Props = {
  onChoose: (seed: Partial<CreateDecisionInput>) => void
}

const DOMAIN_STYLES: Record<string, string> = {
  CAREER: 'border-violet-200 bg-violet-50 text-violet-900',
  FINANCE: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  HEALTH: 'border-rose-200 bg-rose-50 text-rose-900',
  RELATIONSHIPS: 'border-pink-200 bg-pink-50 text-pink-900',
  CREATIVE: 'border-amber-200 bg-amber-50 text-amber-900',
  OTHER: 'border-slate-200 bg-slate-50 text-slate-900',
}

export function StarterDecisionWizard({ onChoose }: Props) {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-amber-50 p-5 shadow-sm">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">
          Starter Wizard
        </p>
        <h2 className="mt-2 text-xl font-semibold text-gray-900">
          Blank pages are hard. Start from a prompt that matches the kind of decision you are making.
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Pick a lane below and we&apos;ll prefill the form with a structured draft you can edit into your real decision.
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {STARTER_DECISION_PROMPTS.map((prompt) => (
          <div
            key={prompt.domain}
            className={`rounded-xl border p-4 shadow-sm ${DOMAIN_STYLES[prompt.domain]}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                  {prompt.domain}
                </p>
                <h3 className="mt-1 text-base font-semibold">{prompt.label}</h3>
              </div>
              <Button size="sm" variant="secondary" onClick={() => onChoose(prompt.seed)}>
                Use prompt
              </Button>
            </div>
            <p className="mt-3 text-sm opacity-80">{prompt.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
