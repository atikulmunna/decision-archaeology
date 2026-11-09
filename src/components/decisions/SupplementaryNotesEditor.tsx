'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'

const SAVE_ERROR = 'Could not save your notes. Your text is still here, so you can try again.'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function SupplementaryNotesEditor({
  decisionId,
  initialNotes,
}: {
  decisionId: string
  initialNotes: string | null
}) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [savedNotes, setSavedNotes] = useState(initialNotes ?? '')
  const [status, setStatus] = useState<SaveStatus>('idle')

  async function saveNotes() {
    setStatus('saving')
    try {
      const response = await fetch(`/api/decisions/${decisionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplementaryNotes: notes }),
      })
      if (!response.ok) {
        setStatus('error')
        return
      }
      setSavedNotes(notes)
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
        Supplementary Notes <span className="text-gray-300">(always editable)</span>
      </h2>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <Textarea
          id="notes"
          aria-label="Supplementary notes"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value)
            if (status !== 'saving') setStatus('idle')
          }}
          placeholder="Add context, reflections, or updates that you want to preserve alongside the original record..."
          className="min-h-[120px] border-0 p-0 focus:ring-0 resize-none"
        />
        {status === 'error' && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {SAVE_ERROR}
          </p>
        )}
        <div className="mt-3 flex items-center justify-end gap-3">
          {status === 'saved' && (
            <span role="status" className="text-sm text-emerald-600">
              Saved
            </span>
          )}
          <Button
            size="sm"
            onClick={saveNotes}
            loading={status === 'saving'}
            disabled={notes === savedNotes}
          >
            Save notes
          </Button>
        </div>
      </div>
    </section>
  )
}
