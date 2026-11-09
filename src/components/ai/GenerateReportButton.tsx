'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

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
      <Button onClick={handleGenerate} loading={pending}>
        {pending ? 'Generating' : 'Generate report'}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
