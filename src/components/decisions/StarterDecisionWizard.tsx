'use client'

import type { CreateDecisionInput } from '@/lib/validations/decision'
import { STARTER_DECISION_PROMPTS } from '@/lib/onboarding'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Eyebrow } from '@/components/ui/Eyebrow'

type Props = {
  onChoose: (seed: Partial<CreateDecisionInput>) => void
}

export function StarterDecisionWizard({ onChoose }: Props) {
  return (
    <section className="flex flex-col gap-4 border-b border-rule pb-6">
      <div className="max-w-2xl">
        <Eyebrow>Starter prompts</Eyebrow>
        <h2 className="mt-2 font-display text-[24px] leading-tight text-ink">
          Blank pages are hard. Start from a prompt that matches your decision.
        </h2>
        <p className="mt-2 text-sm text-ink-2">
          Pick one and the form is prefilled with a structured draft you can edit into your real decision.
        </p>
      </div>

      <ul className="grid gap-3 md:grid-cols-2">
        {STARTER_DECISION_PROMPTS.map((prompt) => (
          <Card as="li" key={prompt.domain} className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Badge tone="ink">{prompt.domain}</Badge>
                <h3 className="mt-2 font-display text-lg leading-snug text-ink">{prompt.label}</h3>
              </div>
              <Button size="sm" variant="secondary" onClick={() => onChoose(prompt.seed)}>
                Use prompt
              </Button>
            </div>
            <p className="text-sm text-ink-2">{prompt.description}</p>
          </Card>
        ))}
      </ul>
    </section>
  )
}
