'use client'

import './globals.css'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { THEME_INIT_SCRIPT } from '@/lib/design/theme'

/** Renders outside the root layout, so it loads the tokens and theme script itself. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-paper text-ink">
        <main className="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-16">
          <div role="alert" className="flex w-full flex-col gap-4 rounded-sm border border-danger bg-surface p-8">
            <Eyebrow className="text-danger">Application error</Eyebrow>
            <h1 className="font-display text-[36px] leading-tight">Something went wrong while loading the app.</h1>
            <p className="text-sm leading-relaxed text-ink-2">
              Please try again. If this keeps happening, check the server logs and use the digest below to trace the
              failure.
            </p>
            {error.digest && (
              <p className="rounded-sm bg-sunken px-4 py-3 font-mono text-xs text-ink-2">Error digest: {error.digest}</p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={reset}>
                Try again
              </Button>
              <Button href="/" variant="secondary">
                Return home
              </Button>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
