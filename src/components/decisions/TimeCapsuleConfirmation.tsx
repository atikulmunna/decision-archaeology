'use client'

import { ArrowLeft, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
import { Card } from '@/components/ui/Card'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { formatCatalogNumber } from '@/lib/catalog'
import type { CreateDecisionInput } from '@/lib/validations/decision'

interface TimeCapsuleConfirmationProps {
  data: CreateDecisionInput
  onConfirm: () => void
  onBack: () => void
  loading: boolean
  upcomingCatalogNumber: number
}

const LOCKED_FIELDS: { key: keyof CreateDecisionInput; label: string }[] = [
  { key: 'summary', label: 'Decision Summary' },
  { key: 'context', label: 'Context' },
  { key: 'alternatives', label: 'Alternatives Considered' },
  { key: 'chosenOption', label: 'Chosen Option' },
  { key: 'reasoning', label: 'Reasoning' },
]

export function TimeCapsuleConfirmation({
  data,
  onConfirm,
  onBack,
  loading,
  upcomingCatalogNumber,
}: TimeCapsuleConfirmationProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Eyebrow>Time capsule</Eyebrow>
        <h2 className="mt-2 font-display text-[28px] leading-tight text-ink">Read it once more before it is sealed.</h2>
        <p className="mt-2 text-sm text-ink-2">
          You get five minutes to fix mistakes after saving. Then these fields are locked for good.
        </p>
      </div>

      <Card as="article" className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule pb-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted">
            Will be sealed as {formatCatalogNumber(upcomingCatalogNumber)}
          </p>
          <Badge tone="signal">Sealing</Badge>
        </div>
        <h3 className="mt-4 break-words font-display text-[26px] leading-tight text-ink">{data.title}</h3>
        <dl className="mt-4 flex flex-col gap-4">
          {LOCKED_FIELDS.map(({ key, label }) => {
            const value = data[key]
            if (!value) return null
            return (
              <div key={key}>
                <dt>
                  <Eyebrow>{label}</Eyebrow>
                </dt>
                <dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-2">{String(value)}</dd>
              </div>
            )
          })}
        </dl>
      </Card>

      <Callout tone="warning" title="This cannot be undone">
        After the edit window closes these fields stay as written. Supplementary notes and outcomes can always be added.
      </Callout>

      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="secondary" onClick={onBack} disabled={loading}>
          <ArrowLeft aria-hidden="true" size={14} strokeWidth={1.5} />
          Go back and edit
        </Button>
        <Button onClick={onConfirm} loading={loading} size="lg">
          {!loading && <Lock aria-hidden="true" size={14} strokeWidth={1.5} />}
          Lock it in
        </Button>
      </div>
    </div>
  )
}
