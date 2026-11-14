'use client'

import { useId, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { fieldClasses } from '@/components/ui/Input'
import { checkInChoices } from '@/lib/revisit'
import { formatDay } from '@/lib/revisit-summary'

/** "Schedule a check-in": opt-in, and it replaces any check-in already set. */
export function CheckInControl({ decisionId, nextCheckIn }: { decisionId: string; nextCheckIn: Date | null }) {
  const id = useId()
  const [next, setNext] = useState<Date | null>(nextCheckIn)
  const [day, setDay] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function schedule(chosen: string) {
    if (saving || !chosen) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/decisions/${decisionId}/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day: chosen }),
      })
      const body = (await response.json().catch(() => null)) as { scheduledFor?: string; error?: string } | null
      if (!response.ok || !body?.scheduledFor) throw new Error(body?.error ?? 'Could not schedule the check-in. Try again.')
      setNext(new Date(body.scheduledFor))
      setDay('')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not schedule the check-in. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div role="group" aria-labelledby={`${id}-label`} className="flex flex-col gap-2">
      <p id={`${id}-label`} className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted">
        Schedule a check-in
      </p>
      {next && <p className="text-sm text-ink-2">{`Next check-in ${formatDay(next)}`}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {checkInChoices(new Date()).map((choice) => (
          <Button key={choice.label} type="button" size="sm" variant="secondary" disabled={saving} onClick={() => void schedule(choice.day)}>
            {choice.label}
          </Button>
        ))}
        <label htmlFor={`${id}-day`} className="sr-only">
          On a day
        </label>
        <input id={`${id}-day`} type="date" value={day} onChange={(event) => setDay(event.target.value)} className={`${fieldClasses()} max-w-[180px]`} />
        <Button type="button" size="sm" variant="ghost" disabled={saving || !day} onClick={() => void schedule(day)}>
          Schedule
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
