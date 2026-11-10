'use client'

import { useState } from 'react'
import { Flag } from 'lucide-react'
import type { BiasEntry } from '@/lib/ai-schema'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Textarea } from '@/components/ui/Textarea'

const SEVERITY: Record<BiasEntry['severity'], { label: string; tone: BadgeTone }> = {
  STRONG: { label: 'Strong', tone: 'danger' },
  MODERATE: { label: 'Moderate', tone: 'ink' },
  MILD: { label: 'Mild', tone: 'neutral' },
}

interface Props {
  bias: BiasEntry
  reportId: string
  index: number
  alreadyFlagged?: boolean
  readOnly?: boolean
}

export function BiasReportCard({ bias, reportId, index, alreadyFlagged = false, readOnly = false }: Props) {
  const [flagged, setFlagged] = useState(alreadyFlagged)
  const [flagging, setFlagging] = useState(false)
  const [showFlagForm, setShowFlagForm] = useState(false)
  const [reason, setReason] = useState('')
  const severity = SEVERITY[bias.severity]

  async function submitFlag() {
    setFlagging(true)
    try {
      await fetch(`/api/ai/reports/${reportId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ biasName: bias.name, reason: reason || undefined }),
      })
      setFlagged(true)
      setShowFlagForm(false)
    } finally {
      setFlagging(false)
    }
  }

  return (
    <li className="grid gap-4 border-t-[1.5px] border-ink pt-5 sm:grid-cols-[3rem_1fr]">
      <span className="font-mono text-[11px] tracking-[0.09em] text-muted">{String(index + 1).padStart(2, '0')}</span>
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-[26px] leading-tight text-ink">{bias.name}</h3>
            <Badge tone={severity.tone}>{severity.label}</Badge>
          </div>
          {readOnly ? null : !flagged ? (
            <Button variant="ghost" size="sm" onClick={() => setShowFlagForm((v) => !v)}>
              <Flag aria-hidden="true" size={12} strokeWidth={1.5} />
              Flag
            </Button>
          ) : (
            <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted">Flagged</span>
          )}
        </div>

        <div>
          <Eyebrow>Evidence</Eyebrow>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">{bias.evidence}</p>
        </div>

        {bias.affectedDecisions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {bias.affectedDecisions.map((d) => (
              <Badge key={d} tone="outline">
                {d}
              </Badge>
            ))}
          </div>
        )}

        <div className="border-l-[1.5px] border-signal pl-4">
          <Eyebrow>Reframe</Eyebrow>
          <p className="mt-1 font-display text-lg italic leading-snug text-ink">{bias.reframe}</p>
        </div>

        {showFlagForm && !flagged && !readOnly && (
          <div className="flex flex-col gap-2 rounded-sm border border-rule bg-sunken p-3">
            <Textarea
              id={`flag-${reportId}-${index}`}
              label="Why is this inaccurate? (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide context if you'd like..."
              rows={2}
              className="min-h-[64px]"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={submitFlag} loading={flagging}>
                Submit flag
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowFlagForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </li>
  )
}
