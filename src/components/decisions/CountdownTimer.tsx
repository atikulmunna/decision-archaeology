'use client'

import { useEffect, useState, useCallback } from 'react'

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
      // silently handled — record will still be displayed as locked on next load
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
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">⏳</span>
          <p className="text-sm font-semibold text-amber-800">Edit Window Open</p>
        </div>
        <p className="text-xl font-mono font-bold text-amber-700">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </p>
      </div>
      <div className="h-2 w-full rounded-full bg-amber-200">
        <div
          className="h-2 rounded-full bg-amber-500 transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-amber-700">
        You can still edit the core fields. After this window, they will be permanently locked.
      </p>
    </div>
  )
}
