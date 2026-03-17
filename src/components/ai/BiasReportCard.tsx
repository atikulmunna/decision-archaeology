'use client'

import { useState } from 'react'
import type { BiasEntry } from '@/lib/ai-schema'

const SEVERITY_CONFIG = {
  MILD: { label: 'Mild', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: '🟡' },
  MODERATE: { label: 'Moderate', color: 'bg-orange-100 text-orange-700 border-orange-200', dot: '🟠' },
  STRONG: { label: 'Strong', color: 'bg-red-100 text-red-700 border-red-200', dot: '🔴' },
}

interface Props {
  bias: BiasEntry
  reportId: string
  alreadyFlagged?: boolean
}

export function BiasReportCard({ bias, reportId, alreadyFlagged = false }: Props) {
  const [flagged, setFlagged] = useState(alreadyFlagged)
  const [flagging, setFlagging] = useState(false)
  const [showFlagForm, setShowFlagForm] = useState(false)
  const [reason, setReason] = useState('')

  const config = SEVERITY_CONFIG[bias.severity]

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
    <div className={`rounded-xl border p-5 ${config.color} relative`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span>{config.dot}</span>
          <h3 className="font-semibold">{bias.name}</h3>
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        </div>
        {!flagged ? (
          <button
            onClick={() => setShowFlagForm((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            🚩 Flag
          </button>
        ) : (
          <span className="text-xs text-gray-400">Flagged ✓</span>
        )}
      </div>

      {/* Evidence */}
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-1">Evidence</p>
        <p className="text-sm">{bias.evidence}</p>
      </div>

      {/* Affected decisions */}
      {bias.affectedDecisions.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {bias.affectedDecisions.map((d) => (
            <span key={d} className="rounded-full bg-white/60 border border-current/20 px-2.5 py-0.5 text-xs">
              {d}
            </span>
          ))}
        </div>
      )}

      {/* Reframe */}
      <div className="rounded-lg bg-white/50 border border-current/10 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-1">Reframe</p>
        <p className="text-sm italic">{bias.reframe}</p>
      </div>

      {/* Flag form */}
      {showFlagForm && !flagged && (
        <div className="mt-3 rounded-lg bg-white/70 border border-current/20 p-3">
          <p className="text-xs font-semibold mb-2">Why is this inaccurate? (optional)</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Provide context if you'd like..."
            className="w-full rounded border border-gray-200 bg-white p-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400"
            rows={2}
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={submitFlag}
              disabled={flagging}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            >
              {flagging ? 'Flagging…' : 'Submit flag'}
            </button>
            <button
              onClick={() => setShowFlagForm(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
