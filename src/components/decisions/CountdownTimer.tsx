'use client'

import { useEffect, useState, useCallback } from 'react'
import { Hourglass } from 'lucide-react'

const LOCK_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

interface CountdownTimerProps {
  lockedAt: string | null
  decisionId: string
  onLocked: () => void
}

export function CountdownTimer({ lockedAt, decisionId, onLocked }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState<number>(LOCK_WINDOW_MS)
  const [isLocking, setIsLocking] = useState(false)

  const triggerLock = useCallback(async () => {
    if (isLocking) return
    setIsLocking(true)
    try {
      await fetch(`/api/decisions/${decisionId}/lock`, { method: 'POST' })
      onLocked()
    } catch {
      // silently handled: the record will still be displayed as locked on next load
    }
  }, [decisionId, isLocking, onLocked])

  useEffect(() => {
    if (!lockedAt) return

    const savedAt = new Date(lockedAt).getTime()
    const interval = setInterval(() => {
      const elapsed = Date.now() - savedAt
      const left = LOCK_WINDOW_MS - elapsed
      if (left <= 0) {
        clearInterval(interval)
        setRemaining(0)
        triggerLock()
      } else {
        setRemaining(left)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [lockedAt, triggerLock])

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  const pct = (remaining / LOCK_WINDOW_MS) * 100

  return (
    <div role="timer" aria-live="off" className="rounded-sm border border-ink bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-ink">
          <Hourglass aria-hidden="true" size={16} strokeWidth={1.5} />
          <p className="font-mono text-[11px] uppercase tracking-[0.09em]">Edit window open</p>
        </div>
        <p className="font-mono text-2xl font-medium tabular-nums text-ink">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </p>
      </div>
      <div className="h-px w-full bg-rule">
        <div className="h-px bg-ink transition-[width] duration-1000" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-3 text-xs text-muted">
        You can still edit the core fields. When the timer reaches zero they are sealed.
      </p>
    </div>
  )
}
