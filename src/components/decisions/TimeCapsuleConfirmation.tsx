'use client'

import { Button } from '@/components/ui/Button'
import type { CreateDecisionInput } from '@/lib/validations/decision'

interface TimeCapsuleConfirmationProps {
  data: CreateDecisionInput
  onConfirm: () => void
  onBack: () => void
  loading: boolean
}

const LOCKED_FIELDS: { key: keyof CreateDecisionInput; label: string }[] = [
  { key: 'summary', label: 'Decision Summary' },
  { key: 'context', label: 'Context' },
  { key: 'alternatives', label: 'Alternatives Considered' },
  { key: 'chosenOption', label: 'Chosen Option' },
  { key: 'reasoning', label: 'Reasoning' },
]

export function TimeCapsuleConfirmation({ data, onConfirm, onBack, loading }: TimeCapsuleConfirmationProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
        <div className="flex items-start gap-3">
          <span className="text-3xl">🔒</span>
          <div>
            <h2 className="text-lg font-bold text-indigo-900">Time Capsule Confirmation</h2>
            <p className="mt-1 text-sm text-indigo-700">
              The following fields will be <strong>permanently locked</strong> after saving. You&apos;ll
              have a 5-minute window to make corrections, then they&apos;re sealed forever.
            </p>
          </div>
        </div>
      </div>

      {/* Decision title */}
      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Decision</h3>
        <p className="text-base font-semibold text-gray-900">{data.title}</p>
      </div>

      {/* Locked fields preview */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Fields to be locked</h3>
        {LOCKED_FIELDS.map(({ key, label }) => {
          const value = data[key]
          if (!value) return null
          return (
            <div key={key} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="mb-1 text-xs font-semibold text-gray-500">{label}</p>
              <p className="text-sm text-gray-800 line-clamp-3">{String(value)}</p>
            </div>
          )
        })}
      </div>

      {/* Warning */}
      <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
        ⚠️ After the 5-minute window, you will <strong>not</strong> be able to modify these fields.
        Supplementary notes can always be added.
      </div>

      {/* Actions */}
      <div className="flex justify-between gap-3">
        <Button variant="secondary" onClick={onBack} disabled={loading}>
          ← Go back and edit
        </Button>
        <Button onClick={onConfirm} loading={loading} size="lg">
          🔒 Lock it in
        </Button>
      </div>
    </div>
  )
}
