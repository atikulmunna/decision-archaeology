'use client'

import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'

/** A failure inside the public demo: the visitor stays in the demo, with nothing about the app or its logs. */
export default function DemoError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-4 rounded-sm border border-danger bg-surface p-8">
      <Eyebrow className="text-danger">Demo error</Eyebrow>
      <h1 className="font-display text-[32px] leading-tight text-ink">This part of the demo could not load.</h1>
      <p className="text-sm leading-relaxed text-ink-2">
        The demo is read-only, so nothing was lost. Try again, or go back to the archive and pick another record.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Button href="/demo" variant="secondary">
          Back to the demo archive
        </Button>
      </div>
    </div>
  )
}
