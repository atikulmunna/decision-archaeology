'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function GenerateReportButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleGenerate() {
    setError(null)

    startTransition(async () => {
      const res = await fetch('/api/ai/reports', { method: 'POST' })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error ?? 'Failed to start report generation.')
        return
      }

      if (data.reportId) {
        router.push(`/ai/reports/${data.reportId}`)
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Generating…' : '+ Generate report'}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
