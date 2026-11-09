'use client'

import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div role="alert" className="flex flex-col gap-4 rounded-sm border border-danger bg-surface p-8">
      <Eyebrow className="text-danger">Dashboard error</Eyebrow>
      <h1 className="font-display text-[32px] leading-tight text-ink">We could not load this view.</h1>
      <p className="text-sm leading-relaxed text-ink-2">
        The rest of the app is still intact. Try reloading this page, and if it keeps failing, check the server logs
        using the digest below.
      </p>
      {error.digest && (
        <p className="rounded-sm bg-sunken px-4 py-3 font-mono text-xs text-ink-2">Error digest: {error.digest}</p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={reset}>
          Retry
        </Button>
        <Button href="/decisions/new" variant="secondary">
          New decision
        </Button>
      </div>
    </div>
  )
}
